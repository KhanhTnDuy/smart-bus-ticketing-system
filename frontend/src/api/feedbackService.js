// feedbackService.js - Dịch vụ Gửi phản ánh & Đánh giá chuyến đi (SCRUM-21/22)

import { apiClient, USE_MOCK } from './apiClient.js';

const STORAGE_KEY = 'smartbus_mock_feedbacks';
const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

const readAll = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const writeAll = (feedbacks) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
};

export const feedbackService = {
  /**
   * SCRUM-21/22: Gửi phản ánh, khiếu nại hoặc đánh giá chuyến đi.
   * rating là tuỳ chọn — để trống (null) nếu chỉ muốn gửi khiếu nại, không chấm sao.
   */
  submit: async ({ routeId, rating, content }) => {
    if (!USE_MOCK) {
      return await apiClient.post('/feedbacks', { routeId, rating, content });
    }
    await delay(300);

    if (!routeId) {
      throw new Error('Vui lòng chọn tuyến xe muốn phản ánh.');
    }
    if (rating != null && (rating < 1 || rating > 5)) {
      throw new Error('Đánh giá phải từ 1 đến 5 sao.');
    }
    const cleanContent = (content || '').trim();
    if (!cleanContent) {
      throw new Error('Nội dung phản ánh không được để trống.');
    }

    const feedback = {
      id: `fb-${Date.now().toString(36)}`,
      routeId,
      rating: rating ?? null,
      content: cleanContent,
      status: 'CHUA_XU_LY',
      createdAt: new Date().toISOString(),
    };

    const all = readAll();
    writeAll([feedback, ...all]);
    return feedback;
  },

  /**
   * Lấy lịch sử phản ánh đã gửi (dùng để hiển thị lại cho hành khách xem, không cần đăng nhập lại).
   */
  getAll: async () => {
    if (!USE_MOCK) {
      return await apiClient.get('/feedbacks');
    }
    await delay(150);
    return readAll();
  },
};
