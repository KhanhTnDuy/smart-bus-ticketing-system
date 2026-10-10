/**
 * API Service cho Báo cáo Doanh thu Bán vé xe buýt.
 *
 * Kết nối với endpoint ASP.NET Core `/api/reports/revenue` (hoặc tương đương).
 * Có fallback tự động sang dữ liệu nội bộ trong DataContext khi backend chưa triển khai controller.
 */

import { api } from './client';

export interface RevenueReportQueryParams {
  startDate?: string;
  endDate?: string;
  routeId?: string;
  groupBy?: 'DAILY' | 'MONTHLY';
}

export interface RevenueItemDto {
  period: string; // e.g. "2026-09-28" hoặc "2026-09"
  ticketCount: number;
  grossRevenue: number;
  refundAmount: number;
  netRevenue: number;
}

export interface RouteRevenueDto {
  routeId: string;
  routeCode: string;
  routeName: string;
  ticketCount: number;
  revenue: number;
}

export interface PaymentMethodRevenueDto {
  method: string;
  count: number;
  amount: number;
}

export interface RevenueReportResponse {
  summary: {
    totalGross: number;
    totalRefund: number;
    netRevenue: number;
    successfulTickets: number;
    refundedTickets: number;
    averageTicketPrice: number;
  };
  timeSeries: RevenueItemDto[];
  byRoute: RouteRevenueDto[];
  byPaymentMethod?: PaymentMethodRevenueDto[];
  isRealApiData?: boolean;
}


export const revenueReportApi = {
  /**
   * Lấy báo cáo doanh thu từ backend (GET /api/reports/revenue). Lỗi mạng, lỗi quyền hay lỗi máy chủ được
   * ném ra để trang báo cho người dùng biết; không có dữ liệu thay thế cục bộ.
   */
  async getRevenueReport(params: RevenueReportQueryParams, signal?: AbortSignal): Promise<RevenueReportResponse> {
    return api.get<RevenueReportResponse>(
      '/api/reports/revenue',
      {
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        routeId: params.routeId && params.routeId !== 'ALL' ? params.routeId : undefined,
        groupBy: params.groupBy || 'DAILY',
      },
      signal,
    );
  },
};
