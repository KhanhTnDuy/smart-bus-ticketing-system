export type ComplaintCategory =
  | 'ATTITUDE'
  | 'DELAY'
  | 'OVERCHARGING'
  | 'VEHICLE_QUALITY'
  | 'SAFETY'
  | 'OTHER';

export type ComplaintStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';

export interface Complaint {
  id: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  routeId: string;
  tripDate: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  createdAt: string;
  status: ComplaintStatus;
  adminResponse?: string;
  processedBy?: string;
  processedAt?: string;
}

export interface RouteItem {
  id: string;
  code: string;
  name: string;
}
