/**
 * Thống kê tỷ lệ lấp đầy theo chuyến, khớp với backend OccupancyReportsController (/api/reports/occupancy).
 */

import { api } from './client';

export type LoadStatus = 'OVERLOAD' | 'OPTIMAL' | 'LOW' | 'NO_TICKETS' | 'NO_BUS';

export const LOAD_STATUS_LABEL: Record<LoadStatus, string> = {
  OVERLOAD: 'Quá tải (từ 85%)',
  OPTIMAL: 'Hợp lý (60-84%)',
  LOW: 'Tải thấp (dưới 60%)',
  NO_TICKETS: 'Chưa có vé',
  NO_BUS: 'Chưa gán xe',
};

export interface TripOccupancy {
  tripId: number;
  routeId: number;
  routeCode: string;
  routeName: string;
  busPlate: string | null;
  driverName: string | null;
  /** Giờ UTC, không có hậu tố Z. */
  departureAt: string;
  tripStatus: string;
  totalSeats: number;
  occupiedSeats: number;
  occupancyPercent: number;
  loadStatus: LoadStatus;
  recommendation: string;
}

export interface OccupancySummary {
  totalTrips: number;
  totalSeats: number;
  occupiedSeats: number;
  averageOccupancyPercent: number;
  overload: number;
  optimal: number;
  low: number;
  noTickets: number;
  noBus: number;
}

export interface OccupancyReport {
  summary: OccupancySummary;
  trips: TripOccupancy[];
}

export const getOccupancyReport = (
  params: { startDate?: string; endDate?: string; routeId?: string; status?: LoadStatus | 'ALL' },
  signal?: AbortSignal,
) =>
  api.get<OccupancyReport>(
    '/api/reports/occupancy',
    {
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
      routeId: params.routeId && params.routeId !== 'ALL' ? params.routeId : undefined,
      status: params.status && params.status !== 'ALL' ? params.status : undefined,
    },
    signal,
  );
