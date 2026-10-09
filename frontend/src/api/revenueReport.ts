/**
 * API Service cho Báo cáo Doanh thu Bán vé xe buýt.
 *
 * Kết nối với endpoint ASP.NET Core `/api/reports/revenue` (hoặc tương đương).
 * Có fallback tự động sang dữ liệu nội bộ trong DataContext khi backend chưa triển khai controller.
 */

import { api, ApiError } from './client';

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
   * Gọi API backend lấy báo cáo doanh thu.
   * Trả về null nếu API chưa sẵn sàng hoặc gặp lỗi kết nối.
   */
  async getRevenueReport(
    params: RevenueReportQueryParams,
    signal?: AbortSignal
  ): Promise<RevenueReportResponse | null> {
    try {
      const response = await api.get<RevenueReportResponse>(
        '/api/reports/revenue',
        {
          startDate: params.startDate || undefined,
          endDate: params.endDate || undefined,
          routeId: params.routeId && params.routeId !== 'ALL' ? params.routeId : undefined,
          groupBy: params.groupBy || 'DAILY',
        },
        signal
      );
      if (response && response.summary) {
        return {
          ...response,
          isRealApiData: true,
        };
      }
      return null;
    } catch (err) {
      // Khi backend chưa dựng controller (HTTP 404/500/ERR_CONNECTION_REFUSED),
      // ghi log nhẹ và trả về null để trang fallback mượt mà sang DataContext.
      if (err instanceof ApiError && (err.status === 404 || err.status === 500 || err.status === 0)) {
        console.info('[RevenueReportApi] Backend API chưa sẵn sàng, đang fallback sang dữ liệu DataContext:', err.message);
      }
      return null;
    }
  },
};
