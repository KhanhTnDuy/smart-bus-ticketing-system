package com.transport.audit.model;

import java.time.LocalDateTime;

public record AuditLog(
        LocalDateTime time,
        String username,
        String action
) {}
