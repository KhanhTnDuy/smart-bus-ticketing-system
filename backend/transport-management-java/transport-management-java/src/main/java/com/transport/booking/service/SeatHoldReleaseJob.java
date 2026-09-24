package com.transport.booking.service;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class SeatHoldReleaseJob {
    private final BookingService bookingService;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread thread = new Thread(r, "seat-hold-release");
        thread.setDaemon(true);
        return thread;
    });

    public SeatHoldReleaseJob(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    public void start(long intervalSeconds) {
        scheduler.scheduleAtFixedRate(this::runOnce, intervalSeconds, intervalSeconds, TimeUnit.SECONDS);
    }

    public void runOnce() {
        int released = bookingService.releaseExpiredHolds();
        if (released > 0) {
            System.out.println("[JOB] Đã nhả " + released + " ghế hết hạn giữ chỗ.");
        }
    }

    public void stop() {
        scheduler.shutdownNow();
    }
}
