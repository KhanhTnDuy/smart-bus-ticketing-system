/**
 * Báo cáo sự cố và quét vé QR.
 *
 * Khớp với backend IncidentsController (/api/incidents) và TicketScansController (/api/ticket-scans).
 * Enum đi qua JSON dưới dạng số theo thứ tự khai báo trong Models/Enums.cs.
 */

import { api } from './client';

export enum IncidentTypeCode {
  TrafficJam = 0,
  Accident = 1,
  Breakdown = 2,
  Other = 3,
}

export enum IncidentStatusCode {
  Open = 0,
  Resolved = 1,
}

export const INCIDENT_TYPE_LABEL: Record<IncidentTypeCode, string> = {
  [IncidentTypeCode.TrafficJam]: 'Kẹt xe',
  [IncidentTypeCode.Accident]: 'Tai nạn',
  [IncidentTypeCode.Breakdown]: 'Hỏng xe',
  [IncidentTypeCode.Other]: 'Sự cố khác',
};

export interface IncidentDto {
  id: number;
  tripId: number;
  routeCode: string;
  routeName: string;
  departureAt: string;
  busPlate: string | null;
  incidentType: IncidentTypeCode;
  delayMinutes: number;
  status: IncidentStatusCode;
  location: string;
  description: string;
  reportedBy: number;
  reporterName: string;
  reporterPhone: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolutionNote: string | null;
}

export interface CreateIncidentRequest {
  tripId: number;
  incidentType: IncidentTypeCode;
  delayMinutes: number;
  location: string;
  description: string;
}

export const listIncidents = (
  query?: { status?: IncidentStatusCode; type?: IncidentTypeCode; tripId?: number },
  signal?: AbortSignal,
) => api.get<IncidentDto[]>('/api/incidents', query, signal);

export const createIncident = (body: CreateIncidentRequest) => api.post<IncidentDto>('/api/incidents', body);

export const resolveIncident = (id: number, note?: string) =>
  api.patch<IncidentDto>(`/api/incidents/${id}/resolve`, { note });

// ---------- Quét vé ----------

export type ScanResultName = 'Valid' | 'Invalid' | 'AlreadyUsed' | 'WrongTrip' | 'Expired';

export interface ScannedTicketInfo {
  ticketId: number;
  bookingCode: string;
  passengerName: string;
  seatCode: string;
  boardStop: string;
  alightStop: string;
  tripId: number;
}

export interface ScanTicketResponse {
  result: ScanResultName;
  accepted: boolean;
  message: string;
  ticket: ScannedTicketInfo | null;
}

export interface TicketScanDto {
  id: number;
  scannedAt: string;
  result: ScanResultName;
  seatCode: string | null;
  passengerName: string | null;
  tripId: number;
}

export const scanTicket = (qrCode: string, tripId: number) =>
  api.post<ScanTicketResponse>('/api/ticket-scans', { qrCode, tripId });

export const listScans = (tripId: number, signal?: AbortSignal) =>
  api.get<TicketScanDto[]>('/api/ticket-scans', { tripId, take: 30 }, signal);

/** Giờ backend trả về là UTC nhưng không có hậu tố Z. */
export const utcToLocal = (iso: string): Date => new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
