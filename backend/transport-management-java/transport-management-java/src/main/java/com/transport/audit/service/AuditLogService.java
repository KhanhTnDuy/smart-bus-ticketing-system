package com.transport.audit.service;

import com.transport.audit.model.AuditLog;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AuditLogService {
    private final List<AuditLog> logs = new ArrayList<>();

    public void log(String username, String action) {
        logs.add(new AuditLog(LocalDateTime.now(), username, action));
    }

    public List<AuditLog> findByUsername(String username) {
        return logs.stream()
                .filter(log -> log.username().equalsIgnoreCase(username))
                .toList();
    }

    public List<AuditLog> findByAction(String action) {
        return logs.stream()
                .filter(log -> log.action().equalsIgnoreCase(action))
                .toList();
    }

    /**
     * SCRUM-16: Lọc nhật ký theo khoảng thời gian. Hai đầu mút đều bao gồm (inclusive).
     * from/to có thể null để bỏ ngỏ một đầu (ví dụ chỉ giới hạn "từ ngày X trở đi").
     */
    public List<AuditLog> findByTimeRange(LocalDateTime from, LocalDateTime to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("Thời gian bắt đầu phải trước thời gian kết thúc.");
        }

        return logs.stream()
                .filter(log -> from == null || !log.time().isBefore(from))
                .filter(log -> to == null || !log.time().isAfter(to))
                .toList();
    }

    /**
     * SCRUM-16: Tìm kiếm và lọc nhật ký kết hợp theo người dùng, khoảng thời gian và loại thao tác.
     * Mỗi tiêu chí là tuỳ chọn (null/blank = bỏ qua tiêu chí đó).
     */
    public List<AuditLog> findByFilters(String username, String action, LocalDateTime from, LocalDateTime to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("Thời gian bắt đầu phải trước thời gian kết thúc.");
        }

        return logs.stream()
                .filter(log -> username == null || username.isBlank() || log.username().equalsIgnoreCase(username))
                .filter(log -> action == null || action.isBlank() || log.action().equalsIgnoreCase(action))
                .filter(log -> from == null || !log.time().isBefore(from))
                .filter(log -> to == null || !log.time().isAfter(to))
                .toList();
    }

    public void printAll() {
        if (logs.isEmpty()) {
            System.out.println("Chưa có nhật ký.");
            return;
        }

        for (AuditLog log : logs) {
            System.out.printf("%s | %-15s | %s%n",
                    log.time(), log.username(), log.action());
        }
    }
}
