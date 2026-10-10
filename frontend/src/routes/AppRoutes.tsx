import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { RoleGuard } from '../components/common/RoleGuard';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

// Admin Pages (Sprint 1)
import { AccountManagementPage } from '../pages/admin/AccountManagementPage';
import { RoleAssignmentPage } from '../pages/admin/RoleAssignmentPage';
import { AuditLogPage } from '../pages/admin/AuditLogPage';

// Manager Pages (Sprint 1)
import { RouteManagementPage } from '../pages/manager/RouteManagementPage';
import { StopManagementPage } from '../pages/manager/StopManagementPage';
import { FareManagementPage } from '../pages/manager/FareManagementPage';
import { ComplaintManagementPage } from '../pages/manager/ComplaintManagementPage';

// Manager Pages (Sprint 2)
import { BusManagementPage } from '../pages/manager/BusManagementPage';
import { ScheduleManagementPage } from '../pages/manager/ScheduleManagementPage';
import { AssignmentManagementPage } from '../pages/manager/AssignmentManagementPage';
import { RefundManagementPage } from '../pages/manager/RefundManagementPage';
import { RevenueReportPage } from '../pages/manager/RevenueReportPage';
import { DiscountVerificationPage } from '../pages/manager/DiscountVerificationPage';
import { OccupancyReportPage } from '../pages/manager/OccupancyReportPage';

// Driver Pages (Sprint 1 & Sprint 2)
import { DriverSchedulePage } from '../pages/driver/DriverSchedulePage';
import { QrScannerPage } from '../pages/driver/QrScannerPage';

// Passenger Pages (Sprint 1 & Sprint 2)
import { RouteBookingPage } from '../pages/passenger/RouteBookingPage';
import { ElectronicTicketPage } from '../pages/passenger/ElectronicTicketPage';
import { InvoicePage } from '../pages/passenger/InvoicePage';
import { PaymentHistoryPage } from '../pages/passenger/PaymentHistoryPage';
import { ComplaintPage } from '../pages/passenger/ComplaintPage';
import { DiscountApplicationPage } from '../pages/passenger/DiscountApplicationPage';
import { PassengerRatingPage } from '../pages/passenger/PassengerRatingPage';

// Incident & Tracking Pages (Sprint 2 - Multi-role)
import { BusTrackingPage } from '../pages/common/BusTrackingPage';
import { IncidentPage } from '../pages/incident/IncidentPage';

// Common Pages
import { AccessDeniedPage } from '../pages/common/AccessDeniedPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';
import { TicketChangeRequestPage } from '../pages/manager/TicketChangeRequestPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes inside MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard / Home (Accessible to all authenticated users) */}
        <Route path="/" element={<DashboardPage />} />

        {/* COMMON SPRINT 2 OPERATIONAL ROUTES (All authenticated users) */}
        <Route path="/tracking" element={<BusTrackingPage />} />
        <Route path="/incident/report" element={<IncidentPage />} />

        {/* ADMIN ROUTES */}
        <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
          <Route path="/admin/accounts" element={<AccountManagementPage />} />
          <Route path="/admin/roles" element={<RoleAssignmentPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogPage />} />
        </Route>

        {/* MANAGER ROUTES (Sprint 1 & Sprint 2) */}
        <Route element={<RoleGuard allowedRoles={['MANAGER', 'ADMIN']} />}>
          <Route path="/manager/routes" element={<RouteManagementPage />} />
          <Route path="/manager/stops" element={<StopManagementPage />} />
          <Route path="/manager/fares" element={<FareManagementPage />} />
          <Route path="/manager/complaints" element={<ComplaintManagementPage />} />
          {/* Sprint 2 Manager Features */}
          <Route path="/manager/buses" element={<BusManagementPage />} />
          <Route path="/manager/schedules" element={<ScheduleManagementPage />} />
          <Route path="/manager/assignments" element={<AssignmentManagementPage />} />

          <Route path="/manager/ticket-requests" element={<TicketChangeRequestPage />} />
          <Route path="/manager/refunds" element={<RefundManagementPage />} />
          <Route path="/manager/incidents" element={<IncidentPage />} />
          <Route path="/manager/revenue" element={<RevenueReportPage />} />

          {/* SPRINT 2 / US17, US18, US19 FEATURES */}
          <Route path="/manager/verifications" element={<DiscountVerificationPage />} />
          <Route path="/manager/occupancy" element={<OccupancyReportPage />} />
        </Route>

        {/* DRIVER ROUTES (Sprint 1 & Sprint 2) */}
        <Route element={<RoleGuard allowedRoles={['DRIVER', 'ADMIN']} />}>
          <Route path="/driver/schedule" element={<DriverSchedulePage />} />
          {/* Sprint 2 Driver Features */}
          <Route path="/driver/qr-scanner" element={<QrScannerPage />} />
          <Route path="/driver/incidents" element={<IncidentPage />} />
        </Route>

        {/* PASSENGER ROUTES (Sprint 1 & Sprint 2) */}
        <Route element={<RoleGuard allowedRoles={['PASSENGER', 'ADMIN']} />}>
          {/* Sprint 1 Passenger Features */}
          <Route path="/passenger/complaints" element={<ComplaintPage />} />
          <Route path="/passenger/discount" element={<DiscountApplicationPage />} />
          {/* F15 - Đánh giá chất lượng chuyến đi (Thành viên C) */}
          <Route path="/passenger/rating" element={<PassengerRatingPage />} />
          {/* Sprint 2 Passenger Features */}
          <Route path="/passenger/booking" element={<RouteBookingPage />} />
          <Route path="/passenger/tickets" element={<ElectronicTicketPage />} />
          <Route path="/passenger/invoices" element={<InvoicePage />} />
          <Route path="/passenger/payments" element={<PaymentHistoryPage />} />
        </Route>

        {/* Access Denied Page */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* 404 Catch All */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
