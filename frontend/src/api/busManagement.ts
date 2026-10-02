/**
 * SCRUM-49 - Quản lý xe buýt và sơ đồ ghế.
 *
 * Các kiểu dưới đây khớp 1-1 với DTO của backend
 * (backend/SmartBusTicketing.Api/DTOs/BusManagementDtos.cs).
 * Backend trả enum dạng số, giống BackendAccountRole.
 */

import { api } from './client';
import type { PagedResponse } from './routeManagement';

export enum BackendBusStatus {
  Active = 0,
  Maintenance = 1,
  Inactive = 2,
}

export interface BusDto {
  id: number;
  plateNumber: string;
  capacity: number;
  status: BackendBusStatus;
  rows: number;
  columns: number;
  tripCount: number;
}

export interface BusSeatDto {
  id: number;
  seatCode: string;
  row: number;
  column: number;
}

export interface BusDetailDto {
  bus: BusDto;
  seats: BusSeatDto[];
}

export interface BusRequest {
  plateNumber: string;
  capacity: number;
  status: BackendBusStatus;
  rows: number;
  columns: number;
}

export const BUS_STATUS_LABEL: Record<BackendBusStatus, string> = {
  [BackendBusStatus.Active]: 'Hoạt động',
  [BackendBusStatus.Maintenance]: 'Bảo dưỡng',
  [BackendBusStatus.Inactive]: 'Ngừng hoạt động',
};

/** Giới hạn khớp với [Range] trong BusRequest để form báo lỗi trước khi gọi API. */
export const BUS_LIMITS = { maxRows: 26, maxColumns: 8, maxCapacity: 208 } as const;

/** Mã ghế giống backend: chữ cái là hàng, số là cột (hàng 1 cột 3 là "A3"). */
export const seatCodeOf = (row: number, column: number): string => `${String.fromCharCode(64 + row)}${column}`;

// Backend mặc định trả enum dạng số, nhưng nếu sau này bật chuỗi thì vẫn đọc được.
type RawBusDto = Omit<BusDto, 'status'> & { status: BackendBusStatus | string };
type RawBusDetailDto = Omit<BusDetailDto, 'bus'> & { bus: RawBusDto };

const normalizeBus = (raw: RawBusDto): BusDto => {
  const status =
    typeof raw.status === 'number'
      ? raw.status
      : (BackendBusStatus[raw.status as keyof typeof BackendBusStatus] ?? BackendBusStatus.Active);
  return { ...raw, status };
};

export const listBuses = async (
  query?: { search?: string; status?: BackendBusStatus; page?: number; pageSize?: number },
  signal?: AbortSignal,
) => {
  const page = await api.get<PagedResponse<RawBusDto>>('/api/buses', query, signal);
  return { ...page, data: page.data.map(normalizeBus) };
};

const toDetail = (raw: RawBusDetailDto): BusDetailDto => ({ ...raw, bus: normalizeBus(raw.bus) });

export const getBus = async (id: number, signal?: AbortSignal) =>
  toDetail(await api.get<RawBusDetailDto>(`/api/buses/${id}`, undefined, signal));

export const createBus = async (body: BusRequest) => toDetail(await api.post<RawBusDetailDto>('/api/buses', body));

export const updateBus = async (id: number, body: BusRequest) =>
  toDetail(await api.put<RawBusDetailDto>(`/api/buses/${id}`, body));

export const deleteBus = (id: number) => api.del(`/api/buses/${id}`);
