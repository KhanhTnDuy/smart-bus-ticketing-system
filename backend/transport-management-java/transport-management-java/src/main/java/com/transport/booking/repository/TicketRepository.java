package com.transport.booking.repository;

import com.transport.booking.model.Ticket;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class TicketRepository {
    private final List<Ticket> tickets = new ArrayList<>();

    public void save(Ticket ticket) {
        tickets.add(ticket);
    }

    public Optional<Ticket> findById(String id) {
        return tickets.stream()
                .filter(t -> t.getId().equalsIgnoreCase(id))
                .findFirst();
    }

    public Optional<Ticket> findOccupying(String tripId, String seatCode) {
        return tickets.stream()
                .filter(t -> t.getTripId().equalsIgnoreCase(tripId)
                        && t.getSeatCode().equalsIgnoreCase(seatCode)
                        && t.occupiesSeat())
                .findFirst();
    }

    public List<Ticket> findAll() {
        return new ArrayList<>(tickets);
    }
}
