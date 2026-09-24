package com.transport.booking.service;

import com.transport.audit.service.AuditLogService;
import com.transport.booking.model.Ticket;
import com.transport.booking.model.TicketStatus;
import com.transport.booking.repository.TicketRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Supplier;

// synchronized: SeatHoldReleaseJob calls releaseExpiredHolds() from its own thread
public class BookingService {
    public static final Duration HOLD_DURATION = Duration.ofMinutes(10);

    private final TicketRepository repository = new TicketRepository();
    private final AuditLogService auditLogService;
    private final Supplier<LocalDateTime> clock;

    public BookingService(AuditLogService auditLogService) {
        this(auditLogService, LocalDateTime::now);
    }

    public BookingService(AuditLogService auditLogService, Supplier<LocalDateTime> clock) {
        this.auditLogService = auditLogService;
        this.clock = clock;
    }

    public synchronized Ticket holdSeat(String ticketId, String tripId,
                                        String seatCode, String passengerId) {
        if (repository.findById(ticketId).isPresent()) {
            throw new IllegalArgumentException("Mã vé đã tồn tại.");
        }
        releaseExpiredHolds();
        if (repository.findOccupying(tripId, seatCode).isPresent()) {
            throw new IllegalStateException("Ghế " + seatCode + " đã có người giữ hoặc đã bán.");
        }

        Ticket ticket = new Ticket(ticketId, tripId, seatCode, passengerId,
                clock.get().plus(HOLD_DURATION));
        repository.save(ticket);
        auditLogService.log(passengerId, "GIU_CHO");
        return ticket;
    }

    public synchronized void confirmPayment(String ticketId) {
        Ticket ticket = getById(ticketId);
        if (ticket.isHoldExpired(clock.get())) {
            ticket.setStatus(TicketStatus.EXPIRED);
            auditLogService.log("system", "NHA_GHE_HET_HAN");
        }
        if (ticket.getStatus() == TicketStatus.EXPIRED) {
            throw new IllegalStateException("Hết thời gian giữ chỗ, vui lòng chọn ghế lại.");
        }
        if (ticket.getStatus() != TicketStatus.HELD) {
            throw new IllegalStateException("Vé không ở trạng thái giữ chỗ: " + ticket.getStatus());
        }

        ticket.setStatus(TicketStatus.VALID);
        auditLogService.log(ticket.getPassengerId(), "XAC_NHAN_VE");
    }

    public synchronized void cancel(String ticketId) {
        Ticket ticket = getById(ticketId);
        if (!ticket.occupiesSeat()) {
            throw new IllegalStateException("Vé không thể hủy ở trạng thái: " + ticket.getStatus());
        }

        ticket.setStatus(TicketStatus.CANCELLED);
        auditLogService.log(ticket.getPassengerId(), "HUY_VE");
    }

    public synchronized int releaseExpiredHolds() {
        LocalDateTime now = clock.get();
        int released = 0;
        for (Ticket ticket : repository.findAll()) {
            if (ticket.isHoldExpired(now)) {
                ticket.setStatus(TicketStatus.EXPIRED);
                released++;
            }
        }
        if (released > 0) {
            auditLogService.log("system", "NHA_GHE_HET_HAN");
        }
        return released;
    }

    public synchronized Ticket getById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy vé."));
    }

    public synchronized List<Ticket> getAll() {
        return repository.findAll();
    }
}
