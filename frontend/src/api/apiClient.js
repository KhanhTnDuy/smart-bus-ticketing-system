// apiClient.js - Lớp trừu tượng gọi HTTP API / REST Backend

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
export const API_BASE_URL = env.VITE_API_BASE_URL || 'https://api.smartbus.vn/v1';

// Cờ kiểm soát sử dụng Mock hay API Backend thực tế
export const USE_MOCK = env.VITE_USE_MOCK !== 'false';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    const token = localStorage.getItem('smartbus_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          // Token hết hạn hoặc không hợp lệ -> xóa phiên và chuyển hướng
          localStorage.removeItem('smartbus_token');
          localStorage.removeItem('smartbus_current_user');
          window.location.href = '/login';
        }
        const error = new Error(data?.message || `Lỗi HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  get(endpoint, options) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, body, options) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options
    });
  }

  put(endpoint, body, options) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
