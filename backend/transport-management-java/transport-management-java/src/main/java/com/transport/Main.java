package com.transport;

import com.transport.account.controller.AccountController;
import com.transport.account.model.Role;
import com.transport.account.service.AccountService;
import com.transport.audit.service.AuditLogService;
import com.transport.booking.controller.BookingController;
import com.transport.booking.service.BookingService;
import com.transport.booking.service.SeatHoldReleaseJob;
import com.transport.feedback.controller.FeedbackController;
import com.transport.feedback.model.Feedback;
import com.transport.feedback.model.FeedbackStatus;
import com.transport.feedback.service.FeedbackService;
import com.transport.route.controller.RouteController;
import com.transport.route.model.Route;
import com.transport.route.model.Stop;
import com.transport.route.service.RouteService;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicReference;

public class Main {
    public static void main(String[] args) {
        System.out.println("==============================================");
        System.out.println("   TRANSPORT MANAGEMENT - JAVA BACKEND DEMO");
        System.out.println("==============================================");

        AuditLogService auditLogService = new AuditLogService();

        AccountService accountService = new AccountService(auditLogService);
        AccountController accountController = new AccountController(accountService);

        RouteService routeService = new RouteService(auditLogService);
        RouteController routeController = new RouteController(routeService);

        FeedbackService feedbackService = new FeedbackService(auditLogService);
        FeedbackController feedbackController = new FeedbackController(feedbackService);

        // ================= ACCOUNT =================
        System.out.println("\n--- 1. QUẢN LÝ TÀI KHOẢN ---");

        accountController.add("A001", "admin", "Nguyễn Admin", Role.ADMIN);
        accountController.add("M001", "manager", "Trần Quản Lý", Role.MANAGER);
        accountController.add("D001", "driver", "Lê Tài Xế", Role.DRIVER);
        accountController.add("C001", "conductor", "Vũ Phụ Xe", Role.CONDUCTOR);
        accountController.add("P001", "passenger", "Phạm Hành Khách", Role.PASSENGER);
        accountController.add("P002", "passenger2", "Đỗ Hành Khách", Role.PASSENGER);

        accountController.list();

        System.out.println("\nKiểm tra quyền:");
        System.out.println("admin -> QUAN_LY_TAI_KHOAN: "
                + accountService.hasPermission("admin", "QUAN_LY_TAI_KHOAN"));
        System.out.println("driver -> QUAN_LY_TAI_KHOAN: "
                + accountService.hasPermission("driver", "QUAN_LY_TAI_KHOAN"));
        System.out.println("conductor -> SOAT_VE: "
                + accountService.hasPermission("conductor", "SOAT_VE"));
        System.out.println("passenger -> SOAT_VE: "
                + accountService.hasPermission("passenger", "SOAT_VE"));

        accountController.update("P001", "Phạm Hành Khách VIP", Role.PASSENGER);
        accountController.delete("D001");
        accountController.list();

        // ================= ROUTE =================
        System.out.println("\n--- 2. QUẢN LÝ TUYẾN ĐƯỜNG ---");

        routeController.addRoute(new Route(
                "R001",
                "Tuyến 01",
                "Thái Nguyên",
                "Hà Nội",
                30000
        ));

        routeController.addRoute(new Route(
                "R002",
                "Tuyến 02",
                "Sông Công",
                "Thái Nguyên",
                15000
        ));

        routeController.addStop("R001", new Stop("S001", "Bến xe Thái Nguyên", 1));
        routeController.addStop("R001", new Stop("S002", "Phổ Yên", 2));
        routeController.addStop("R001", new Stop("S003", "Bến xe Mỹ Đình", 3));

        routeController.listRoutes();
        routeController.showRoute("R001");

        routeController.updateFare("R002", 18000);
        routeController.deleteRoute("R002");
        routeController.listRoutes();

        // ================= FEEDBACK =================
        System.out.println("\n--- 3. KHIẾU NẠI / ĐÁNH GIÁ ---");

        Feedback feedback = feedbackController.create(
                "F001",
                "P001",
                "R001",
                5,
                "Chuyến đi đúng giờ, tài xế lịch sự."
        );

        feedbackController.list();
        feedbackController.updateStatus("F001", FeedbackStatus.DANG_XU_LY);
        feedbackController.updateStatus("F001", FeedbackStatus.DA_XU_LY);
        feedbackController.show("F001");

        // ================= BOOKING =================
        System.out.println("\n--- 4. GIỮ CHỖ 10 PHÚT ---");

        AtomicReference<LocalDateTime> demoNow = new AtomicReference<>(LocalDateTime.of(2026, 10, 1, 6, 30));
        BookingService bookingService = new BookingService(auditLogService, demoNow::get);
        BookingController bookingController = new BookingController(bookingService);
        SeatHoldReleaseJob releaseJob = new SeatHoldReleaseJob(bookingService);

        bookingController.holdSeat("T001", "TRIP-R001-0700", "A1", "P001");
        bookingController.holdSeat("T002", "TRIP-R001-0700", "A1", "P002");
        bookingController.holdSeat("T003", "TRIP-R001-0700", "A2", "P002");
        bookingController.confirmPayment("T003");

        System.out.println("... 11 phút sau, P001 chưa thanh toán ...");
        demoNow.set(demoNow.get().plusMinutes(11));
        releaseJob.runOnce();
        bookingController.confirmPayment("T001");
        bookingController.holdSeat("T004", "TRIP-R001-0700", "A1", "P002");
        bookingController.list();

        // ================= AUDIT LOG =================
        System.out.println("\n--- 5. NHẬT KÝ HỆ THỐNG ---");
        auditLogService.printAll();

        System.out.println("\n==============================================");
        System.out.println("Demo hoàn tất.");
        System.out.println("Bạn có thể mở từng package để phát triển tiếp.");
        System.out.println("==============================================");
    }
}
