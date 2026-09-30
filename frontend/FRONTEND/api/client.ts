/**
 * Lớp gọi HTTP dùng chung cho toàn bộ frontend.
 *
 * Base URL lấy từ biến môi trường VITE_API_URL (xem .env.example). Nếu không đặt
 * thì mặc định về cổng dev của backend trong launchSettings.json.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5180').replace(/\/+$/, '');

const TOKEN_STORAGE_KEY = 'smart_bus_access_token';

/** Lỗi trả về từ API, giữ lại status để trang gọi phân biệt 401/403/404/409. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* localStorage bị chặn (chế độ riêng tư) thì bỏ qua, request sẽ đi không kèm token */
  }
};

/** Backend trả lỗi nghiệp vụ dạng ProblemDetails, thông điệp nằm ở `title`. */
const extractMessage = async (response: Response): Promise<string> => {
  const fallback = `Yêu cầu thất bại (HTTP ${response.status}).`;
  const raw = await response.text().catch(() => '');
  if (!raw) return fallback;

  try {
    const body = JSON.parse(raw);
    if (typeof body?.title === 'string' && body.title) return body.title;
    if (typeof body?.message === 'string' && body.message) return body.message;
    // Lỗi validation của ASP.NET: { errors: { Field: ["..."] } }
    if (body?.errors && typeof body.errors === 'object') {
      const messages = Object.values(body.errors).flat().filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
    if (typeof body?.detail === 'string' && body.detail) return body.detail;
  } catch {
    // Không phải JSON thì dùng nguyên văn, nhưng chặn stack trace dài đổ ra giao diện.
    return raw.length > 300 ? fallback : raw;
  }
  return fallback;
};

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
}

const buildUrl = (path: string, query?: RequestOptions['query']): string => {
  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Không kết nối được tới máy chủ. Kiểm tra backend đã chạy và VITE_API_URL.');
  }

  if (!response.ok) {
    if (response.status === 401) throw new ApiError(401, 'Bạn cần đăng nhập lại để thực hiện thao tác này.');
    if (response.status === 403) throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.');
    throw new ApiError(response.status, await extractMessage(response));
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: (path: string) => request<void>(path, { method: 'DELETE' }),
};
