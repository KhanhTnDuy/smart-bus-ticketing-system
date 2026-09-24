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
