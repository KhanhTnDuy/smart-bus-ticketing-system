/**
 * US2 - Nhật ký truy cập và thao tác hệ thống.
 *
 * Khớp với backend/SmartBusTicketing.Api/Controllers/AuditLogsController.cs.
 * Mọi endpoint đều yêu cầu vai trò Admin (`[Authorize(Roles = "Admin")]`).
 *
 * Backend chưa đăng ký JsonStringEnumConverter trong Program.cs nên enum được
 * serialize thành số. Hai enum dưới đây phải giữ đúng thứ tự khai báo trong
 * backend/SmartBusTicketing.Api/Models/Enums.cs.
 */

import { api } from './client';

export enum AuditActionTypeCode {
  Login = 0,
  Logout = 1,
  Create = 2,
  Update = 3,
  Delete = 4,
  View = 5,
  Export = 6,
  Payment = 7,
  TicketBuy = 8,
  FeedbackSubmit = 9,
  StatusChange = 10,
}

export enum AuditStatusCode {
  Success = 0,
  Failure = 1,
  Warning = 2,
}

/** Nhãn tiếng Việt cho ô chọn "Loại thao tác". */
export const ACTION_TYPE_LABELS: Record<AuditActionTypeCode, string> = {
  [AuditActionTypeCode.Login]: 'Đăng nhập',
  [AuditActionTypeCode.Logout]: 'Đăng xuất',
  [AuditActionTypeCode.Create]: 'Thêm mới',
  [AuditActionTypeCode.Update]: 'Cập nhật',
  [AuditActionTypeCode.Delete]: 'Xóa',
  [AuditActionTypeCode.View]: 'Xem',
  [AuditActionTypeCode.Export]: 'Kết xuất',
  [AuditActionTypeCode.Payment]: 'Thanh toán',
  [AuditActionTypeCode.TicketBuy]: 'Mua vé',
  [AuditActionTypeCode.FeedbackSubmit]: 'Gửi phản ánh',
  [AuditActionTypeCode.StatusChange]: 'Đổi trạng thái',
};

/** Bản ghi nhật ký trả về từ `GET /api/audit-logs`, khớp Models/AuditLog. */
export interface AuditLogDto {
  id: number;
  accountId: number | null;
  username: string;
  action: string;
  actionType: AuditActionTypeCode;
  targetResource: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: AuditStatusCode;
  details: string | null;
  /** Thời điểm ghi nhận, giờ UTC. */
  createdAt: string;
}

/**
 * Khai báo bằng `type` (không phải `interface`) để TypeScript cho phép truyền
 * thẳng vào tham số `query` của `api.get`, vốn nhận một index signature.
 */
export type AuditLogQuery = {
  /** Khớp một phần tên đăng nhập. */
  username?: string;
  actionType?: AuditActionTypeCode;
  status?: AuditStatusCode;
  /** Ngày bắt đầu, dạng YYYY-MM-DD, theo giờ UTC. */
  from?: string;
  /** Ngày kết thúc, dạng YYYY-MM-DD; backend tính bao gồm cả ngày này. */
  to?: string;
  /** Tìm trong Action, TargetResource và Details. Không tìm trong username. */
  search?: string;
};

export const listAuditLogs = (query?: AuditLogQuery, signal?: AbortSignal) =>
  api.get<AuditLogDto[]>('/api/audit-logs', query, signal);

export const getAuditLog = (id: number, signal?: AbortSignal) =>
  api.get<AuditLogDto>(`/api/audit-logs/${id}`, undefined, signal);
