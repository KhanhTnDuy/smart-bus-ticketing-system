package com.smartbus.model;

import java.time.LocalDateTime;

/**
 * Model: Nhật ký thao tác hệ thống
 */
public class AuditLog {

    private Long          id;
    private Integer       userId;
    private String        username;
    private String        action;
    private String        actionType;   // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW, EXPORT, PAYMENT, ...
    private String        targetResource;
    private String        ipAddress;
    private String        userAgent;
    private String        status;       // SUCCESS, FAILURE, WARNING
    private String        details;
    private LocalDateTime createdAt;

    // =========================================================
    // Constructors
    // =========================================================
    public AuditLog() {}

    public AuditLog(Long id, Integer userId, String username, String action,
                    String actionType, String targetResource, String ipAddress,
                    String userAgent, String status, String details, LocalDateTime createdAt) {
        this.id             = id;
        this.userId         = userId;
        this.username       = username;
        this.action         = action;
        this.actionType     = actionType;
        this.targetResource = targetResource;
        this.ipAddress      = ipAddress;
        this.userAgent      = userAgent;
        this.status         = status;
        this.details        = details;
        this.createdAt      = createdAt;
    }

    // =========================================================
    // Helper: màu Badge theo actionType
    // =========================================================
    public String getActionTypeBadgeClass() {
        if (actionType == null) return "bg-secondary";
        return switch (actionType) {
            case "LOGIN"            -> "bg-success";
            case "LOGOUT"           -> "bg-secondary";
            case "CREATE"           -> "bg-primary";
            case "UPDATE"           -> "bg-warning text-dark";
            case "DELETE"           -> "bg-danger";
            case "VIEW"             -> "bg-info text-dark";
            case "EXPORT"           -> "bg-purple";
            case "PAYMENT"          -> "bg-success";
            case "TICKET_BUY"       -> "bg-primary";
            case "FEEDBACK_SUBMIT"  -> "bg-indigo";
            case "STATUS_CHANGE"    -> "bg-warning text-dark";
            default                 -> "bg-secondary";
        };
    }

    /** Nhãn hiển thị tiếng Việt của actionType */
    public String getActionTypeLabel() {
        if (actionType == null) return "—";
        return switch (actionType) {
            case "LOGIN"            -> "Đăng nhập";
            case "LOGOUT"           -> "Đăng xuất";
            case "CREATE"           -> "Tạo mới";
            case "UPDATE"           -> "Cập nhật";
            case "DELETE"           -> "Xóa";
            case "VIEW"             -> "Xem";
            case "EXPORT"           -> "Xuất dữ liệu";
            case "PAYMENT"          -> "Thanh toán";
            case "TICKET_BUY"       -> "Mua vé";
            case "FEEDBACK_SUBMIT"  -> "Gửi phản ánh";
            case "STATUS_CHANGE"    -> "Đổi trạng thái";
            default                 -> actionType;
        };
    }

    /** Màu badge theo status */
    public String getStatusBadgeClass() {
        if (status == null) return "bg-secondary";
        return switch (status) {
            case "SUCCESS" -> "bg-success";
            case "FAILURE" -> "bg-danger";
            case "WARNING" -> "bg-warning text-dark";
            default        -> "bg-secondary";
        };
    }

    public String getStatusLabel() {
        if (status == null) return "—";
        return switch (status) {
            case "SUCCESS" -> "Thành công";
            case "FAILURE" -> "Thất bại";
            case "WARNING" -> "Cảnh báo";
            default        -> status;
        };
    }

    // =========================================================
    // Getters & Setters
    // =========================================================
    public Long getId()                         { return id; }
    public void setId(Long id)                  { this.id = id; }

    public Integer getUserId()                  { return userId; }
    public void setUserId(Integer userId)        { this.userId = userId; }

    public String getUsername()                 { return username; }
    public void setUsername(String username)     { this.username = username; }

    public String getAction()                   { return action; }
    public void setAction(String action)         { this.action = action; }

    public String getActionType()               { return actionType; }
    public void setActionType(String at)         { this.actionType = at; }

    public String getTargetResource()           { return targetResource; }
    public void setTargetResource(String tr)     { this.targetResource = tr; }

    public String getIpAddress()                { return ipAddress; }
    public void setIpAddress(String ip)          { this.ipAddress = ip; }

    public String getUserAgent()                { return userAgent; }
    public void setUserAgent(String ua)          { this.userAgent = ua; }

    public String getStatus()                   { return status; }
    public void setStatus(String status)         { this.status = status; }

    public String getDetails()                  { return details; }
    public void setDetails(String details)       { this.details = details; }

    public LocalDateTime getCreatedAt()         { return createdAt; }
    public void setCreatedAt(LocalDateTime ca)   { this.createdAt = ca; }
}
