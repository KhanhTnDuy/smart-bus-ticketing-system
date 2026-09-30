// feedbackService.js - Dịch vụ Gửi Phản ánh (F14) & Đánh giá chuyến đi (F15)
// Tích hợp LocalStorage persistence, Mock API latency & chuẩn cấu trúc dữ liệu SmartBus

import { apiClient, USE_MOCK } from './apiClient.js';

const STORAGE_KEY_FEEDBACKS = 'smartbus_mock_feedbacks';
const STORAGE_KEY_RATINGS = 'smartbus_mock_trip_ratings';
const STORAGE_KEY_PENDING_TRIPS = 'smartbus_mock_pending_trips';

const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

// Dữ liệu mẫu ban đầu cho F14 (Phản ánh & Khiếu nại)
export const INITIAL_FEEDBACKS = [
  {
    id: 101,
    ticketCode: 'TK-88192',
    routeId: 'route-sg-dl',
    routeName: 'SG-DL01: TP. Hồ Chí Minh - Đà Lạt',
    passengerId: 4,
    passengerName: 'Phạm Thị Thúy An',
    passengerPhone: '0912345678',
    passengerEmail: 'thuyan.pham@example.com',
    type: 'FEEDBACK',
    category: 'Điều hòa & Tiện ích',
    urgency: 'MEDIUM', // LOW, MEDIUM, HIGH, URGENT
    subject: 'Hệ thống điều hòa hàng ghế 12 quá lạnh',
    content: 'Hệ thống máy lạnh hàng ghế số 12 thổi trực tiếp xuống quá lạnh, dù đã xoay cửa gió nhưng vẫn không đỡ. Mong nhà xe kiểm tra bộ điều nhiệt tại khoang.',
    attachmentUrl: null,
    status: 'RESOLVED',
    adminResponse: 'SmartBus đã kiểm tra xe số 51B-892.44 và khắc phục van điều áp máy lạnh số 2. Chân thành cảm ơn góp ý của bạn!',
    respondedAt: '2026-03-24T10:30:00.000Z',
    createdAt: '2026-03-23T14:30:00.000Z'
  },
  {
    id: 102,
    ticketCode: 'TK-74211',
    routeId: 'route-hn-sp',
    routeName: 'HN-SP02: Hà Nội - Sa Pa',
    passengerId: 4,
    passengerName: 'Phạm Thị Thúy An',
    passengerPhone: '0912345678',
    passengerEmail: 'thuyan.pham@example.com',
    type: 'FEEDBACK',
    category: 'Thái độ phục vụ',
    urgency: 'HIGH',
    subject: 'Nhân viên phụ xe hỗ trợ hành lý chưa nhiệt tình',
    content: 'Tại điểm dừng chân nghỉ giữa chặng, nhân viên xếp hành lý lấy nhầm valy của mình và có thái độ gắt gỏng khi mình nhờ đổi lại. Cần chấn chỉnh văn hóa giao tiếp.',
    attachmentUrl: null,
    status: 'PROCESSING',
    adminResponse: 'Ban điều hành đã liên hệ tài xế phụ xe chuyến 29B-432.18 để xác minh sự việc và sẽ phản hồi phương án xử lý trong 24h tới.',
    respondedAt: '2026-03-27T09:15:00.000Z',
    createdAt: '2026-03-26T16:45:00.000Z'
  },
  {
    id: 103,
    ticketCode: 'TK-61904',
    routeId: 'route-sg-ct',
    routeName: 'SG-CT04: TP. Hồ Chí Minh - Cần Thơ',
    passengerId: 4,
    passengerName: 'Phạm Thị Thúy An',
    passengerPhone: '0912345678',
    passengerEmail: 'thuyan.pham@example.com',
    type: 'FEEDBACK',
    category: 'Vệ sinh phương tiện',
    urgency: 'LOW',
    subject: 'Gối tựa đầu và sàn xe hàng ghế sau cần hút bụi kỹ hơn',
    content: 'Chuyến xe đi buổi chiều sàn xe còn vụn bánh của khách lượt trước chưa kịp hút sạch. Rất mong đội vệ sinh dọn dẹp kỹ hơn giữa 2 lượt xuất bến.',
    attachmentUrl: null,
    status: 'PENDING',
    adminResponse: null,
    respondedAt: null,
    createdAt: '2026-03-28T08:20:00.000Z'
  }
];

// Dữ liệu chuyến đi vừa hoàn thành của hành khách (chưa đánh giá hoặc đã đánh giá)
export const INITIAL_COMPLETED_TRIPS = [
  {
    tripId: 'TRIP-2026-881',
    ticketCode: 'TK-88192',
    routeId: 'route-sg-dl',
    routeName: 'SG-DL01: TP. Hồ Chí Minh - Đà Lạt',
    driverName: 'Nguyễn Văn Hùng',
    busPlate: '51B-892.44',
    departureTime: '2026-03-28 07:30',
    arrivalTime: '2026-03-28 13:45',
    seatNumber: 'A12 (Tầng 1)',
    price: 250000,
    hasRated: false
  },
  {
    tripId: 'TRIP-2026-619',
    ticketCode: 'TK-61904',
    routeId: 'route-sg-ct',
    routeName: 'SG-CT04: TP. Hồ Chí Minh - Cần Thơ',
    driverName: 'Lê Hoàng Nam',
    busPlate: '65B-129.83',
    departureTime: '2026-03-27 14:15',
    arrivalTime: '2026-03-27 18:00',
    seatNumber: 'A08',
    price: 165000,
    hasRated: false
  },
  {
    tripId: 'TRIP-2026-742',
    ticketCode: 'TK-74211',
    routeId: 'route-hn-sp',
    routeName: 'HN-SP02: Hà Nội - Sa Pa',
    driverName: 'Trần Đình Trọng',
    busPlate: '29B-432.18',
    departureTime: '2026-03-24 21:00',
    arrivalTime: '2026-03-25 04:30',
    seatNumber: 'B04 (Phòng VIP)',
    price: 350000,
    hasRated: true
  }
];

// Dữ liệu mẫu ban đầu cho F15 (Đánh giá chuyến đi)
export const INITIAL_RATINGS = [
  {
    id: 201,
    tripId: 'TRIP-2026-742',
    ticketCode: 'TK-74211',
    routeId: 'route-hn-sp',
    routeName: 'HN-SP02: Hà Nội - Sa Pa',
    driverName: 'Trần Đình Trọng',
    busPlate: '29B-432.18',
    passengerId: 4,
    passengerName: 'Phạm Thị Thúy An',
    isAnonymous: false,
    rating: 5,
    subRatings: {
      driver: 5,
      punctuality: 5,
      cleanliness: 5,
      amenities: 4
    },
    tags: ['Lái xe an toàn 🛡️', 'Đúng giờ tuyệt đối ⏱️', 'Khoang xe sạch sẽ ✨', 'Bác tài vui vẻ 😊'],
    content: 'Chuyến xe đêm lên Sa Pa chạy cực kỳ êm và an toàn, tài xế không bấm còi inh ỏi trong đêm giúp hành khách ngủ rất ngon. Phòng VIP giường nằm sạch và rộng rãi!',
    likesCount: 14,
    adminResponse: 'Cảm ơn bạn Thúy An đã chia sẻ cảm nhận tuyệt vời. Chúc bạn luôn có những chuyến đi ý nghĩa cùng SmartBus!',
    createdAt: '2026-03-25T08:30:00.000Z'
  },
  {
    id: 202,
    tripId: 'TRIP-2026-512',
    ticketCode: 'TK-51280',
    routeId: 'route-dn-qn',
    routeName: 'DN-QN03: Đà Nẵng - Quy Nhơn',
    driverName: 'Võ Minh Tuấn',
    busPlate: '43B-098.22',
    passengerId: 7,
    passengerName: 'Đỗ Hữu Hùng',
    isAnonymous: false,
    rating: 4,
    subRatings: {
      driver: 4,
      punctuality: 5,
      cleanliness: 4,
      amenities: 4
    },
    tags: ['Đúng giờ tuyệt đối ⏱️', 'Xe chạy rất êm 🚌', 'Điều hòa mát lạnh ❄️'],
    content: 'Xe xuất bến đúng từng phút, đón trả khách đúng quy định các trạm trên app. Có nước suối và khăn lạnh miễn phí chu đáo.',
    likesCount: 8,
    adminResponse: 'SmartBus luôn cam kết thời gian chuẩn xác. Rất hân hạnh được phục vụ bạn!',
    createdAt: '2026-03-22T19:00:00.000Z'
  },
  {
    id: 203,
    tripId: 'TRIP-2026-401',
    ticketCode: 'TK-40129',
    routeId: 'route-sg-dl',
    routeName: 'SG-DL01: TP. Hồ Chí Minh - Đà Lạt',
    driverName: 'Nguyễn Văn Hùng',
    busPlate: '51B-892.44',
    passengerId: 9,
    passengerName: 'Hành khách ẩn danh',
    isAnonymous: true,
    rating: 5,
    subRatings: {
      driver: 5,
      punctuality: 4,
      cleanliness: 5,
      amenities: 5
    },
    tags: ['Lái xe an toàn 🛡️', 'Bác tài vui vẻ 😊', 'Khoang xe sạch sẽ ✨'],
    content: 'Bác tài Hùng lái xe đèo Bảo Lộc rất vững tay, không bị say xe tí nào. Giường nằm êm và wifi lướt mượt mà suốt đường.',
    likesCount: 19,
    adminResponse: null,
    createdAt: '2026-03-20T11:45:00.000Z'
  },
  {
    id: 204,
    tripId: 'TRIP-2026-302',
    ticketCode: 'TK-30288',
    routeId: 'route-sg-ct',
    routeName: 'SG-CT04: TP. Hồ Chí Minh - Cần Thơ',
    driverName: 'Lê Hoàng Nam',
    busPlate: '65B-129.83',
    passengerId: 12,
    passengerName: 'Trần Văn Long',
    isAnonymous: false,
    rating: 3,
    subRatings: {
      driver: 3,
      punctuality: 4,
      cleanliness: 3,
      amenities: 2
    },
    tags: ['Wifi chập chờn 📶', 'Đúng giờ tuyệt đối ⏱️'],
    content: 'Xe đúng giờ nhưng wifi chặng cao tốc Tiền Giang bị mất sóng liên tục không làm việc được. Cần nâng cấp gói cước 4G/5G trên xe.',
    likesCount: 5,
    adminResponse: 'SmartBus đã liên hệ nhà mạng nâng cấp thiết bị phát sóng router chuyên dụng cho tuyến miền Tây.',
    createdAt: '2026-03-18T16:10:00.000Z'
  }
];

// Helper quản lý LocalStorage
const getStoredData = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const setStoredData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Lỗi ghi LocalStorage cho ${key}:`, e);
  }
};

export const feedbackService = {
  // ============================================================
  // PHÂN HỆ F14: GỬI PHẢN ÁNH & KHIẾU NẠI (FEEDBACK MODULE)
  // ============================================================

  /**
   * Lấy danh sách phản ánh & khiếu nại (F14)
   */
  getFeedbacks: async (filters = {}) => {
    if (!USE_MOCK) {
      return await apiClient.get('/feedbacks');
    }
    await delay();
    let list = getStoredData(STORAGE_KEY_FEEDBACKS, INITIAL_FEEDBACKS);

    if (filters.passengerId) {
      list = list.filter(f => f.passengerId === Number(filters.passengerId));
    }
    if (filters.routeId && filters.routeId !== 'ALL') {
      list = list.filter(f => f.routeId === filters.routeId);
    }
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(f => f.status === filters.status);
    }
    if (filters.urgency && filters.urgency !== 'ALL') {
      list = list.filter(f => f.urgency === filters.urgency);
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(f =>
        (f.subject && f.subject.toLowerCase().includes(q)) ||
        (f.content && f.content.toLowerCase().includes(q)) ||
        (f.ticketCode && f.ticketCode.toLowerCase().includes(q)) ||
        (f.routeName && f.routeName.toLowerCase().includes(q))
      );
    }
    return list;
  },

  /**
   * Tạo mới phản ánh / khiếu nại (F14)
   */
  createFeedback: async (feedbackData) => {
    if (!USE_MOCK) {
      return await apiClient.post('/feedbacks', feedbackData);
    }
    await delay(350);

    const routeId = (feedbackData.routeId || '').trim();
    const content = (feedbackData.content || '').trim();

    if (!routeId) {
      throw new Error('Vui lòng chọn tuyến xe buýt liên quan đến phản ánh.');
    }
    if (!content || content.length < 10) {
      throw new Error('Nội dung phản ánh phải có tối thiểu 10 ký tự để nhà xe có đủ căn cứ giải quyết.');
    }

    const currentList = getStoredData(STORAGE_KEY_FEEDBACKS, INITIAL_FEEDBACKS);

    const newFeedback = {
      id: Date.now(),
      ticketCode: (feedbackData.ticketCode || `TK-${Math.floor(10000 + Math.random() * 90000)}`).trim(),
      routeId,
      routeName: feedbackData.routeName || routeId,
      passengerId: feedbackData.passengerId || 4,
      passengerName: feedbackData.passengerName || 'Hành khách SmartBus',
      passengerPhone: feedbackData.passengerPhone || '0901234567',
      passengerEmail: feedbackData.passengerEmail || 'passenger@example.com',
      type: 'FEEDBACK',
      category: feedbackData.category || 'Vấn đề khác',
      urgency: feedbackData.urgency || 'MEDIUM', // LOW, MEDIUM, HIGH, URGENT
      subject: (feedbackData.subject || 'Phản ánh chất lượng dịch vụ').trim(),
      content,
      attachmentUrl: feedbackData.attachmentUrl || null,
      status: 'PENDING', // PENDING -> PROCESSING -> RESOLVED
      adminResponse: null,
      respondedAt: null,
      createdAt: new Date().toISOString()
    };

    const updated = [newFeedback, ...currentList];
    setStoredData(STORAGE_KEY_FEEDBACKS, updated);
    return newFeedback;
  },

  /**
   * Xóa phản ánh (chỉ cho phép khi ở trạng thái PENDING)
   */
  deleteFeedback: async (id) => {
    if (!USE_MOCK) {
      return await apiClient.delete(`/feedbacks/${id}`);
    }
    await delay(250);
    const list = getStoredData(STORAGE_KEY_FEEDBACKS, INITIAL_FEEDBACKS);
    const filtered = list.filter(f => f.id !== Number(id));
    setStoredData(STORAGE_KEY_FEEDBACKS, filtered);
    return { success: true };
  },

  // ============================================================
  // PHÂN HỆ F15: ĐÁNH GIÁ CHUYẾN ĐI (TRIP RATING MODULE)
  // ============================================================

  /**
   * Lấy danh sách chuyến đi đã hoàn thành cần đánh giá (F15)
   */
  getPendingTripsToRate: async () => {
    await delay(150);
    return getStoredData(STORAGE_KEY_PENDING_TRIPS, INITIAL_COMPLETED_TRIPS);
  },

  /**
   * Lấy danh sách đánh giá chuyến đi (F15)
   */
  getTripRatings: async (filters = {}) => {
    if (!USE_MOCK) {
      return await apiClient.get('/ratings');
    }
    await delay();
    let list = getStoredData(STORAGE_KEY_RATINGS, INITIAL_RATINGS);

    if (filters.passengerId) {
      list = list.filter(r => r.passengerId === Number(filters.passengerId));
    }
    if (filters.routeId && filters.routeId !== 'ALL') {
      list = list.filter(r => r.routeId === filters.routeId);
    }
    if (filters.rating && filters.rating !== 'ALL') {
      list = list.filter(r => r.rating === Number(filters.rating));
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(r =>
        (r.content && r.content.toLowerCase().includes(q)) ||
        (r.driverName && r.driverName.toLowerCase().includes(q)) ||
        (r.busPlate && r.busPlate.toLowerCase().includes(q)) ||
        (r.routeName && r.routeName.toLowerCase().includes(q))
      );
    }

    // Sắp xếp
    if (filters.sortBy === 'HIGHEST') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (filters.sortBy === 'LOWEST') {
      list.sort((a, b) => a.rating - b.rating);
    } else {
      // Mới nhất mặc định
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  },

  /**
   * Gửi đánh giá mới cho chuyến đi (F15)
   */
  createTripRating: async (ratingData) => {
    if (!USE_MOCK) {
      return await apiClient.post('/ratings', ratingData);
    }
    await delay(350);

    const ratingScore = Number(ratingData.rating);
    if (!ratingScore || ratingScore < 1 || ratingScore > 5) {
      throw new Error('Vui lòng chọn số sao đánh giá tổng quan (từ 1 đến 5 sao).');
    }
    if (!ratingData.routeId) {
      throw new Error('Vui lòng chọn chuyến xe bạn đã trải nghiệm.');
    }
    if (!ratingData.content || ratingData.content.trim().length < 5) {
      throw new Error('Vui lòng chia sẻ đôi lời nhận xét (tối thiểu 5 ký tự) về chuyến đi.');
    }

    const currentRatings = getStoredData(STORAGE_KEY_RATINGS, INITIAL_RATINGS);

    const newRating = {
      id: Date.now(),
      tripId: ratingData.tripId || `TRIP-${Date.now().toString().slice(-4)}`,
      ticketCode: ratingData.ticketCode || `TK-${Math.floor(10000 + Math.random() * 90000)}`,
      routeId: ratingData.routeId,
      routeName: ratingData.routeName || ratingData.routeId,
      driverName: ratingData.driverName || 'Tài xế SmartBus',
      busPlate: ratingData.busPlate || '51B-MEMBER',
      passengerId: ratingData.passengerId || 4,
      passengerName: ratingData.isAnonymous ? 'Hành khách ẩn danh' : (ratingData.passengerName || 'Phạm Thị Thúy An'),
      isAnonymous: Boolean(ratingData.isAnonymous),
      rating: ratingScore,
      subRatings: {
        driver: Number(ratingData.subRatings?.driver || ratingScore),
        punctuality: Number(ratingData.subRatings?.punctuality || ratingScore),
        cleanliness: Number(ratingData.subRatings?.cleanliness || ratingScore),
        amenities: Number(ratingData.subRatings?.amenities || ratingScore)
      },
      tags: Array.isArray(ratingData.tags) ? ratingData.tags : [],
      content: ratingData.content.trim(),
      likesCount: 1,
      adminResponse: null,
      createdAt: new Date().toISOString()
    };

    const updatedRatings = [newRating, ...currentRatings];
    setStoredData(STORAGE_KEY_RATINGS, updatedRatings);

    // Đánh dấu chuyến đi đã được chấm sao trong pending trips
    if (ratingData.tripId) {
      const pendingTrips = getStoredData(STORAGE_KEY_PENDING_TRIPS, INITIAL_COMPLETED_TRIPS);
      const updatedTrips = pendingTrips.map(trip =>
        trip.tripId === ratingData.tripId ? { ...trip, hasRated: true } : trip
      );
      setStoredData(STORAGE_KEY_PENDING_TRIPS, updatedTrips);
    }

    return newRating;
  },

  /**
   * Thích (Like/Thả tim) một đánh giá
   */
  likeTripRating: async (id) => {
    const list = getStoredData(STORAGE_KEY_RATINGS, INITIAL_RATINGS);
    const updated = list.map(item => {
      if (item.id === Number(id)) {
        return { ...item, likesCount: (item.likesCount || 0) + 1 };
      }
      return item;
    });
    setStoredData(STORAGE_KEY_RATINGS, updated);
    return { success: true };
  },

  /**
   * Xóa đánh giá của chính mình (F15)
   */
  deleteTripRating: async (id) => {
    const list = getStoredData(STORAGE_KEY_RATINGS, INITIAL_RATINGS);
    const filtered = list.filter(r => r.id !== Number(id));
    setStoredData(STORAGE_KEY_RATINGS, filtered);
    return { success: true };
  },

  /**
   * Reset dữ liệu về ban đầu
   */
  resetAllData: () => {
    setStoredData(STORAGE_KEY_FEEDBACKS, INITIAL_FEEDBACKS);
    setStoredData(STORAGE_KEY_RATINGS, INITIAL_RATINGS);
    setStoredData(STORAGE_KEY_PENDING_TRIPS, INITIAL_COMPLETED_TRIPS);
    return true;
  }
};
