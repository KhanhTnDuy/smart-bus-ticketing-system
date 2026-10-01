// Base API Client for Smart Bus Backend Integration

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
export const TOKEN_STORAGE_KEY = 'smart_bus_auth_token';

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    // Parse JSON safely
    const contentType = res.headers.get('content-type');
    let responseData: any = null;
    if (contentType && contentType.includes('application/json')) {
      responseData = await res.json();
    } else {
      responseData = await res.text();
    }

    if (!res.ok) {
      const errorMessage =
        (typeof responseData === 'object' && (responseData?.message || responseData?.error)) ||
        `Lỗi kết nối máy chủ (Mã: ${res.status})`;
      throw new ApiError(res.status, errorMessage, responseData);
    }

    return responseData as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network / Offline error (e.g. Failed to fetch when backend is not running)
    throw new ApiError(0, 'Không thể kết nối đến máy chủ Backend (Offline).', err);
  }
}

export function isNetworkOrOfflineError(err: any): boolean {
  if (!err) return false;
  if (err.status === 0) return true;
  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('offline') ||
    msg.includes('kết nối') ||
    msg.includes('refused') ||
    msg.includes('load failed') ||
    msg.includes('network error')
  );
}

export default apiRequest;
