package com.transport.booking.controller;

import com.transport.booking.model.Ticket;
import com.transport.booking.service.BookingService;

public class BookingController {
    private final BookingService service;

    public BookingController(BookingService service) {
        this.service = service;
    }

    public void holdSeat(String ticketId, String tripId, String seatCode, String passengerId) {
        try {
            Ticket ticket = service.holdSeat(ticketId, tripId, seatCode, passengerId);
            System.out.println("[OK] Giữ ghế " + seatCode + " đến " + ticket.getHoldExpiresAt());
        } catch (IllegalStateException e) {
            System.out.println("[TỪ CHỐI] " + e.getMessage());
        }
    }

    public void confirmPayment(String ticketId) {
        try {
            service.confirmPayment(ticketId);
            System.out.println("[OK] Thanh toán thành công, vé " + ticketId + " có hiệu lực.");
        } catch (IllegalStateException e) {
            System.out.println("[TỪ CHỐI] " + e.getMessage());
        }
    }

    public void cancel(String ticketId) {
        service.cancel(ticketId);
        System.out.println("[OK] Đã hủy vé: " + ticketId);
    }

    public void list() {
        System.out.println("Danh sách vé:");
        service.getAll().forEach(ticket -> System.out.println("  " + ticket));
    }
}
