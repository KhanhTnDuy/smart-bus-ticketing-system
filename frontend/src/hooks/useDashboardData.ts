import { useEffect, useState } from 'react';
import { Role } from '../types';
import { listRoutes, listFares, RouteDto } from '../api/routeManagement';
import { listAccounts } from '../api/accountManagement';
import { listAuditLogs, AuditLogDto } from '../api/auditLogs';
import { listFeedbacks, FeedbackDto, FeedbackStatusCode, FeedbackTypeCode } from '../api/feedback';
import { listAssignments, TripAssignmentDto } from '../api/assignments';
import { listMyTickets } from '../api/booking';
import { listChangeRequests } from '../api/ticketChangeRequests';
import { parseUtc } from '../api/datetime';

/**
 * Số liệu thật cho trang tổng quan, lấy từ backend theo đúng quyền của từng vai trò.
 *
 * Mỗi nguồn được nạp độc lập bằng allSettled: một nguồn bị từ chối (403 vì vai trò không đủ
 * quyền) hoặc lỗi mạng chỉ làm riêng phần đó trống, không kéo sập cả trang. Giá trị `null`
 * nghĩa là "không có số liệu để hiển thị" — khác với 0, vốn là một con số thật. Nhờ đó giao
 * diện ẩn hẳn ô thay vì khoe một số 0 sai.
 *
 * Cố ý KHÔNG có doanh thu, vị trí GPS, sự cố kỹ thuật hay hồ sơ hoàn tiền: hệ thống chưa có
 * luồng thanh toán, theo dõi vị trí hay báo sự cố, nên không có nguồn thật cho các số đó.
 */
export interface DashboardData {
  isLoading: boolean;

  routes: RouteDto[];
  /** Tổng số trạm dừng, cộng từ số trạm của từng tuyến. */
  stopCount: number;
  /** Số biểu giá; null nếu không tải được. */
  fareCount: number | null;
  /** Số tài khoản; chỉ Admin được xem, các vai trò khác là null. */
  accountCount: number | null;

  /** Chuyến chưa khởi hành và chưa hủy; null nếu vai trò không được xem lịch chuyến. */
  upcomingTripCount: number | null;
  /** Trong số chuyến sắp chạy, số chuyến còn thiếu xe hoặc tài xế. */
  unassignedTripCount: number | null;

  /** Yêu cầu hủy/đổi vé đang chờ duyệt; chỉ Admin/Quản lý được xem. */
  pendingChangeRequestCount: number | null;
  /** Phản ánh đang ở trạng thái Chưa xử lý; chỉ Admin/Quản lý được xem. */
  pendingFeedbackCount: number | null;

  /** Vé còn hiệu lực của chính hành khách; null với vai trò không phải hành khách. */
  myActiveTicketCount: number | null;

  recentAuditLogs: AuditLogDto[];
  recentReviews: FeedbackDto[];
  /** Điểm trung bình các đánh giá; null nếu chưa có đánh giá nào. */
  averageRating: number | null;
}

const EMPTY: DashboardData = {
  isLoading: true,
  routes: [],
  stopCount: 0,
  fareCount: null,
  accountCount: null,
  upcomingTripCount: null,
  unassignedTripCount: null,
  pendingChangeRequestCount: null,
  pendingFeedbackCount: null,
  myActiveTicketCount: null,
  recentAuditLogs: [],
  recentReviews: [],
  averageRating: null,
};

const isStaffManager = (role: Role | null | undefined) => role === 'ADMIN' || role === 'MANAGER';

/** Giá trị của một Promise.allSettled nếu thành công, ngược lại undefined. */
const valueOf = <T,>(result: PromiseSettledResult<T>): T | undefined =>
  result.status === 'fulfilled' ? result.value : undefined;

export const useDashboardData = (role: Role | null | undefined): DashboardData => {
  const [data, setData] = useState<DashboardData>(EMPTY);

  useEffect(() => {
    // Chưa biết vai trò thì chưa gọi gì: gọi nhầm sẽ nhận 403 rồi hiểu sai là "không có dữ liệu".
    if (!role) return;

    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      const manager = isStaffManager(role);
      const canSeeTrips = manager || role === 'DRIVER';

      const [routesR, faresR, accountsR, tripsR, changeR, feedbackR, auditR, ticketsR] =
        await Promise.allSettled([
          listRoutes(signal),
          listFares(undefined, signal),
          role === 'ADMIN' ? listAccounts(undefined, signal) : Promise.resolve(null),
          canSeeTrips ? listAssignments({ pageSize: 100 }, signal) : Promise.resolve(null),
          manager ? listChangeRequests('Pending', signal) : Promise.resolve(null),
          manager ? listFeedbacks(undefined, signal) : Promise.resolve(null),
          role === 'ADMIN' ? listAuditLogs(undefined, signal) : Promise.resolve(null),
          role === 'PASSENGER' ? listMyTickets(signal) : Promise.resolve(null),
        ]);

      if (signal.aborted) return;

      const routes = valueOf(routesR) ?? [];
      const trips: TripAssignmentDto[] | null = valueOf(tripsR) ?? null;
      const feedbacks = valueOf(feedbackR) ?? null;
      const myTickets = valueOf(ticketsR) ?? null;
      const now = Date.now();

      // Chuyến sắp chạy: chưa khởi hành và chưa hủy. Trạng thái có thể là số hoặc chuỗi tùy
      // chỗ backend trả, nên so cả hai dạng thay vì tin vào một.
      const upcoming = trips
        ? trips.filter((t) => {
            const cancelled = t.status === 4 || t.status === 'Cancelled';
            const completed = t.status === 3 || t.status === 'Completed';
            return !cancelled && !completed && parseUtc(t.departureAt).getTime() > now;
          })
        : null;

      const reviews = feedbacks
        ? feedbacks.filter((f) => f.type === FeedbackTypeCode.Review && f.rating > 0)
        : [];

      setData({
        isLoading: false,
        routes,
        stopCount: routes.reduce((sum, r) => sum + r.stopCount, 0),
        fareCount: valueOf(faresR)?.length ?? null,
        accountCount: valueOf(accountsR)?.length ?? null,
        upcomingTripCount: upcoming ? upcoming.length : null,
        unassignedTripCount: upcoming ? upcoming.filter((t) => !t.bus || !t.driver).length : null,
        pendingChangeRequestCount: valueOf(changeR)?.length ?? null,
        pendingFeedbackCount: feedbacks
          ? feedbacks.filter((f) => f.status === FeedbackStatusCode.ChuaXuLy).length
          : null,
        myActiveTicketCount: myTickets
          ? myTickets.filter((t) => t.status === 'Held' || t.status === 'Valid').length
          : null,
        recentAuditLogs: (valueOf(auditR) ?? []).slice(0, 5),
        recentReviews: reviews.slice(0, 3),
        averageRating: reviews.length
          ? reviews.reduce((sum, f) => sum + f.rating, 0) / reviews.length
          : null,
      });
    };

    void load();
    return () => controller.abort();
  }, [role]);

  return data;
};
