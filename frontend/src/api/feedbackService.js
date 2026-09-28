// feedbackService.js - Dịch vụ Gửi & Quản lý Phản ánh, Đánh giá chất lượng dịch vụ

import { apiClient, USE_MOCK } from './apiClient.js';

const STORAGE_KEY_FEEDBACKS = 'smartbus_mock_feedbacks';
const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

export const INITIAL_FEEDBACKS = [
  {
    id: 1,
    routeId: 'route-sg-dl',
    routeName: 'SG-DL01: TP. Hồ Chí Minh - Đà Lạt',
    passengerId: 4,
    passengerName: 'Phạm Thị Thúy An',
    type: 'RATING',
    category: 'Chất lượng xe',
    rating: 5,
    content: 'Chuyến xe rất êm ái, bác tài lái cẩn thận và phục vụ chu đáo, nhiệt tình suốt chặng.',
    status: 'RESOLVED',
    adminResponse: 'Cảm ơn quý khách đã tin tưởng và ủng hộ dịch vụ xe buýt thông minh SmartBus!',
    createdAt: '2026-03-20T10:15:00.000Z'
  },
  {
    id: 2,
    routeId: 'route-hn-sp',
    routeName: 'HN-SP02: Hà Nội - Sa Pa',
    passengerId: 4,
    passengerName: 'Phạm Thị Thúy An',
    type: 'FEEDBACK',
    category: 'Điều hòa / Tiện ích',
    rating: null,
    content: 'Hệ thống máy lạnh hàng ghế số 12 hơi lạnh quá, mong nhà xe điều chỉnh nhiệt độ phù hợp hơn.',
    status: 'PROCESSING',
    adminResponse: 'SmartBus đã tiếp nhận và thông báo tổ kỹ thuật kiểm tra lại cụm điều hòa của xe.',
    createdAt: '2026-03-22T14:30:00.000Z'
  },
  {
    id: 3,
    routeId: 'route-dn-qn',
    routeName: 'DN-QN03: Đà Nẵng - Quy Nhơn',
    passengerId: 7,
    passengerName: 'Đỗ Hữu Hùng',
    type: 'RATING',
    category: 'Đúng giờ',
    rating: 4,
    content: 'Xe xuất bến đúng giờ, đón trả khách đúng các trạm quy định trên tuyến.',
    status: 'RESOLVED',
    adminResponse: 'SmartBus luôn nỗ lực giữ vững tiêu chuẩn đúng giờ. Cảm ơn đánh giá tích cực của bạn!',
    createdAt: '2026-03-24T08:00:00.000Z'
  },
  {
    id: 4,
    routeId: 'route-sg-ct',
    routeName: 'SG-CT04: TP. Hồ Chí Minh - Cần Thơ',
    passengerId: 4,
    passengerName: 'Phạm Thị Thúy An',
    type: 'FEEDBACK',
    category: 'Thái độ phục vụ',
    rating: 2,
    content: 'Nhân viên soát vé tại trạm Cai Lậy cần nhẹ nhàng hơn với hành khách lớn tuổi.',
    status: 'PENDING',
    adminResponse: null,
    createdAt: '2026-03-26T16:45:00.000Z'
  }
];

const getStoredFeedbacks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(INITIAL_FEEDBACKS));
      return INITIAL_FEEDBACKS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_FEEDBACKS;
  }
};

const setStoredFeedbacks = (feedbacks) => {
  localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(feedbacks));
};

export const feedbackService = {
  /**
   * Lấy danh sách tất cả phản ánh & đánh giá (hỗ trợ lọc)
   */
  getFeedbacks: async (filters = {}) => {
    if (!USE_MOCK) {
      return await apiClient.get('/feedbacks');
    }
    await delay();
    let feedbacks = getStoredFeedbacks();

    if (filters.passengerId) {
      feedbacks = feedbacks.filter(f => f.passengerId === Number(filters.passengerId));
    }
    if (filters.routeId && filters.routeId !== 'ALL') {
      feedbacks = feedbacks.filter(f => f.routeId === filters.routeId);
    }
    if (filters.type && filters.type !== 'ALL') {
      feedbacks = feedbacks.filter(f => f.type === filters.type);
    }
    if (filters.status && filters.status !== 'ALL') {
      feedbacks = feedbacks.filter(f => f.status === filters.status);
    }
    return feedbacks;
  },

  /**
   * Lấy chi tiết một phản ánh theo ID
   */
  getFeedbackById: async (id) => {
    if (!USE_MOCK) {
      return await apiClient.get(`/feedbacks/${id}`);
    }
    await delay();
    const feedbacks = getStoredFeedbacks();
    return feedbacks.find(f => f.id === Number(id)) || null;
  },

  /**
   * Tạo mới phản ánh hoặc đánh giá chuyến đi
   * routeId và content là BẮT BUỘC, rating là TÙY CHỌN
   */
  createFeedback: async (feedbackData) => {
    if (!USE_MOCK) {
      return await apiClient.post('/feedbacks', feedbackData);
    }
    await delay(300);

    const cleanRouteId = (feedbackData.routeId || '').trim();
    const cleanContent = (feedbackData.content || '').trim();

    // 1. Kiểm tra bắt buộc: routeId
    if (!cleanRouteId) {
      throw new Error('Vui lòng chọn tuyến xe cần gửi phản ánh hoặc đánh giá.');
    }

    // 2. Kiểm tra bắt buộc: content
    if (!cleanContent) {
      throw new Error('Vui lòng nhập nội dung phản ánh hoặc nhận xét của bạn.');
    }

    // 3. Kiểm tra tùy chọn: rating (1..5 nếu có cung cấp)
    let validRating = null;
    if (feedbackData.rating !== undefined && feedbackData.rating !== null && feedbackData.rating !== '') {
      const numRating = Number(feedbackData.rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        throw new Error('Số sao đánh giá phải từ 1 đến 5 sao.');
      }
      validRating = Math.round(numRating);
    }

    const feedbacks = getStoredFeedbacks();

    const newFeedback = {
      id: Date.now(),
      routeId: cleanRouteId,
      routeName: (feedbackData.routeName || cleanRouteId).trim(),
      passengerId: feedbackData.passengerId || null,
      passengerName: (feedbackData.passengerName || 'Hành khách').trim(),
      type: feedbackData.type || (validRating ? 'RATING' : 'FEEDBACK'),
      category: (feedbackData.category || 'Chung').trim(),
      rating: validRating,
      content: cleanContent,
      status: 'PENDING',
      adminResponse: null,
      createdAt: new Date().toISOString()
    };

    const updated = [newFeedback, ...feedbacks];
    setStoredFeedbacks(updated);

    return newFeedback;
  },

  /**
   * Chỉnh sửa thông tin phản ánh
   */
  updateFeedback: async (id, feedbackData) => {
    if (!USE_MOCK) {
      return await apiClient.put(`/feedbacks/${id}`, feedbackData);
    }
    await delay(300);
    const feedbacks = getStoredFeedbacks();
    const targetIndex = feedbacks.findIndex(f => f.id === Number(id));

    if (targetIndex === -1) {
      throw new Error('Không tìm thấy bản ghi phản ánh cần cập nhật.');
    }

    const current = feedbacks[targetIndex];
    const updated = {
      ...current,
      ...feedbackData,
      id: current.id,
      updatedAt: new Date().toISOString()
    };

    feedbacks[targetIndex] = updated;
    setStoredFeedbacks([...feedbacks]);
    return updated;
  },

  /**
   * Xóa phản ánh
   */
  deleteFeedback: async (id) => {
    if (!USE_MOCK) {
      return await apiClient.delete(`/feedbacks/${id}`);
    }
    await delay(250);
    const feedbacks = getStoredFeedbacks();
    const filtered = feedbacks.filter(f => f.id !== Number(id));
    setStoredFeedbacks(filtered);
    return { success: true };
  },

  /**
   * Lấy danh sách phản ánh theo Tuyến xe
   */
  getFeedbacksByRoute: async (routeId) => {
    return feedbackService.getFeedbacks({ routeId });
  },

  /**
   * Lấy danh sách phản ánh theo Hành khách
   */
  getFeedbacksByPassenger: async (passengerId) => {
    return feedbackService.getFeedbacks({ passengerId });
  },

  /**
   * Khôi phục dữ liệu mẫu ban đầu
   */
  resetFeedbacks: () => {
    setStoredFeedbacks(INITIAL_FEEDBACKS);
    return INITIAL_FEEDBACKS;
  }
};
