package com.smartbus.model;

import java.time.LocalDateTime;

/**
 * Model: Phản ánh / Đánh giá của hành khách
 */
public class Feedback {

    private Long          id;
    private Integer       passengerId;
    private String        passengerName;
    private String        passengerEmail;
    private String        passengerPhone;
    private String        tripId;
    private String        tripRoute;
    private String        type;          // COMPLAINT | REVIEW
    private String        subject;
    private String        content;
    private Integer       rating;        // 1..5 (chỉ khi type = REVIEW)
    private String        imagePath;
    private String        status;        // PENDING | PROCESSING | RESOLVED
    private String        adminResponse;
    private String        processedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // =========================================================
    // Constructors
    // =========================================================
    public Feedback() {}

    // =========================================================
    // Helper methods
    // =========================================================

    /** Badge màu sắc theo status */
    public String getStatusBadgeClass() {
        if (status == null) return "badge-pending";
        return switch (status) {
            case "PENDING"    -> "badge-pending";
            case "PROCESSING" -> "badge-processing";
            case "RESOLVED"   -> "badge-resolved";
            default           -> "badge-pending";
        };
    }

    /** Nhãn tiếng Việt của status */
    public String getStatusLabel() {
        if (status == null) return "Chưa xử lý";
        return switch (status) {
            case "PENDING"    -> "Chưa xử lý";
            case "PROCESSING" -> "Đang xử lý";
            case "RESOLVED"   -> "Đã xử lý";
            default           -> status;
        };
    }

    /** Nhãn tiếng Việt của type */
    public String getTypeLabel() {
        if (type == null) return "—";
        return switch (type) {
            case "COMPLAINT" -> "Khiếu nại";
            case "REVIEW"    -> "Đánh giá";
            default          -> type;
        };
    }

    /** Badge màu của type */
    public String getTypeBadgeClass() {
        if ("COMPLAINT".equals(type)) return "bg-danger";
        if ("REVIEW".equals(type))    return "bg-primary";
        return "bg-secondary";
    }

    /** Icon cho type */
    public String getTypeIcon() {
        if ("COMPLAINT".equals(type)) return "fa-exclamation-circle";
        if ("REVIEW".equals(type))    return "fa-star";
        return "fa-comment";
    }

    /** Tóm tắt nội dung (tối đa 80 ký tự) */
    public String getContentSummary() {
        if (content == null) return "";
        return content.length() > 80 ? content.substring(0, 80) + "..." : content;
    }

    /** Render sao HTML */
    public String getStarsHtml() {
        if (rating == null) return "<span class=\"text-muted\">—</span>";
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            if (i <= rating) {
                sb.append("<i class=\"fas fa-star text-warning\"></i>");
            } else {
                sb.append("<i class=\"far fa-star text-muted\"></i>");
            }
        }
        return sb.toString();
    }

    /** Trả về icon cho từng cấp trạng thái (dùng trong timeline) */
    public String getStatusIcon() {
        if (status == null) return "fa-clock";
        return switch (status) {
            case "PENDING"    -> "fa-clock";
            case "PROCESSING" -> "fa-spinner";
            case "RESOLVED"   -> "fa-check-circle";
            default           -> "fa-circle";
        };
    }

    // =========================================================
    // Getters & Setters
    // =========================================================
    public Long getId()                              { return id; }
    public void setId(Long id)                       { this.id = id; }

    public Integer getPassengerId()                  { return passengerId; }
    public void setPassengerId(Integer pi)            { this.passengerId = pi; }

    public String getPassengerName()                 { return passengerName; }
    public void setPassengerName(String pn)           { this.passengerName = pn; }

    public String getPassengerEmail()                { return passengerEmail; }
    public void setPassengerEmail(String pe)          { this.passengerEmail = pe; }

    public String getPassengerPhone()                { return passengerPhone; }
    public void setPassengerPhone(String pp)          { this.passengerPhone = pp; }

    public String getTripId()                        { return tripId; }
    public void setTripId(String tripId)             { this.tripId = tripId; }

    public String getTripRoute()                     { return tripRoute; }
    public void setTripRoute(String tr)               { this.tripRoute = tr; }

    public String getType()                          { return type; }
    public void setType(String type)                 { this.type = type; }

    public String getSubject()                       { return subject; }
    public void setSubject(String subject)           { this.subject = subject; }

    public String getContent()                       { return content; }
    public void setContent(String content)           { this.content = content; }

    public Integer getRating()                       { return rating; }
    public void setRating(Integer rating)            { this.rating = rating; }

    public String getImagePath()                     { return imagePath; }
    public void setImagePath(String ip)               { this.imagePath = ip; }

    public String getStatus()                        { return status; }
    public void setStatus(String status)             { this.status = status; }

    public String getAdminResponse()                 { return adminResponse; }
    public void setAdminResponse(String ar)           { this.adminResponse = ar; }

    public String getProcessedBy()                   { return processedBy; }
    public void setProcessedBy(String pb)             { this.processedBy = pb; }

    public LocalDateTime getCreatedAt()              { return createdAt; }
    public void setCreatedAt(LocalDateTime ca)        { this.createdAt = ca; }

    public LocalDateTime getUpdatedAt()              { return updatedAt; }
    public void setUpdatedAt(LocalDateTime ua)        { this.updatedAt = ua; }
}
