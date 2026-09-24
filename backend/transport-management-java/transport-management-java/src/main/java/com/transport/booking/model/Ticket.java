package com.transport.booking.model;

import java.time.LocalDateTime;

public class Ticket {
    private final String id;
    private final String tripId;
    private final String seatCode;
    private final String passengerId;
    private final LocalDateTime holdExpiresAt;
    private TicketStatus status;

    public Ticket(String id, String tripId, String seatCode,
                  String passengerId, LocalDateTime holdExpiresAt) {
        this.id = id;
        this.tripId = tripId;
        this.seatCode = seatCode;
        this.passengerId = passengerId;
        this.holdExpiresAt = holdExpiresAt;
        this.status = TicketStatus.HELD;
    }

    public String getId() { return id; }
    public String getTripId() { return tripId; }
    public String getSeatCode() { return seatCode; }
    public String getPassengerId() { return passengerId; }
    public LocalDateTime getHoldExpiresAt() { return holdExpiresAt; }
    public TicketStatus getStatus() { return status; }

    public void setStatus(TicketStatus status) { this.status = status; }

    public boolean occupiesSeat() {
        return status == TicketStatus.HELD || status == TicketStatus.VALID;
    }

    public boolean isHoldExpired(LocalDateTime now) {
        return status == TicketStatus.HELD && !now.isBefore(holdExpiresAt);
    }

    @Override
    public String toString() {
        return String.format(
                "Ticket{id='%s', trip='%s', seat='%s', passenger='%s', status=%s, holdUntil=%s}",
                id, tripId, seatCode, passengerId, status, holdExpiresAt
        );
    }
}
