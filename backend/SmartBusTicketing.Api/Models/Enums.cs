namespace SmartBusTicketing.Api.Models;

public enum AccountRole { Admin, Manager, Driver, Conductor, Passenger }

public enum AuditActionType { Login, Logout, Create, Update, Delete, View, Export, Payment, TicketBuy, FeedbackSubmit, StatusChange }

public enum AuditStatus { Success, Failure, Warning }

public enum VerificationStatus { Pending, Approved, Rejected }

public enum TicketType { Single, Monthly }

public enum BusStatus { Active, Maintenance, Inactive }

public enum TripStatus { Scheduled, Running, Delayed, Completed, Cancelled }

public enum StaffDuty { Driver, Conductor }

public enum BookingStatus { Pending, Confirmed, Cancelled, Expired }

public enum TicketStatus { Held, Valid, Used, Cancelled, Exchanged, Expired }

public enum ChangeRequestType { Cancel, Exchange }

public enum ChangeRequestStatus { Pending, Approved, Rejected }

public enum ScanResult { Valid, Invalid, AlreadyUsed, WrongTrip, Expired }

public enum DiscountType { Percent, Fixed }

public enum PaymentMethod { Momo, VnPay, ZaloPay, Card, BankTransfer }

public enum PaymentStatus { Pending, Success, Failed, Refunded }

public enum RefundReason { PaymentFailed, TicketCancelled, TripCancelled }

public enum RefundStatus { Pending, Success, Failed }

public enum IncidentType { TrafficJam, Accident, Breakdown, Other }

public enum IncidentStatus { Open, Resolved }

public enum NotificationType { BusArriving, Delay, Incident, Other }

public enum FeedbackType { Complaint, Review }

public enum FeedbackStatus { ChuaXuLy, DangXuLy, DaXuLy }
