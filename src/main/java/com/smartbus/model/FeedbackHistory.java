package com.smartbus.model;

import java.time.LocalDateTime;

/**
 * Model: Lịch sử thay đổi trạng thái phản ánh
 */
public class FeedbackHistory {

    private Long          id;
    private Long          feedbackId;
    private String        oldStatus;
    private String        newStatus;
    private String        changedBy;
    private String        note;
    private LocalDateTime changedAt;

    public FeedbackHistory() {}

    public String getOldStatusLabel() {
        return statusLabel(oldStatus);
    }

    public String getNewStatusLabel() {
        return statusLabel(newStatus);
    }

    public String getNewStatusBadgeClass() {
        if (newStatus == null) return "bg-secondary";
        return switch (newStatus) {
            case "PENDING"    -> "bg-warning text-dark";
            case "PROCESSING" -> "bg-primary";
            case "RESOLVED"   -> "bg-success";
            default           -> "bg-secondary";
        };
    }

    private String statusLabel(String s) {
        if (s == null) return "—";
        return switch (s) {
            case "PENDING"    -> "Chưa xử lý";
            case "PROCESSING" -> "Đang xử lý";
            case "RESOLVED"   -> "Đã xử lý";
            default           -> s;
        };
    }

    // Getters & Setters
    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public Long getFeedbackId()                  { return feedbackId; }
    public void setFeedbackId(Long fid)          { this.feedbackId = fid; }

    public String getOldStatus()                 { return oldStatus; }
    public void setOldStatus(String os)           { this.oldStatus = os; }

    public String getNewStatus()                 { return newStatus; }
    public void setNewStatus(String ns)           { this.newStatus = ns; }

    public String getChangedBy()                 { return changedBy; }
    public void setChangedBy(String cb)           { this.changedBy = cb; }

    public String getNote()                      { return note; }
    public void setNote(String note)             { this.note = note; }

    public LocalDateTime getChangedAt()          { return changedAt; }
    public void setChangedAt(LocalDateTime ca)    { this.changedAt = ca; }
}
