package com.transport.feedback.service;

import com.transport.audit.service.AuditLogService;
import com.transport.feedback.model.Feedback;
import com.transport.feedback.model.FeedbackStatus;
import com.transport.feedback.repository.FeedbackRepository;

import java.util.List;

public class FeedbackService {
    private final FeedbackRepository repository = new FeedbackRepository();
    private final AuditLogService auditLogService;

    public FeedbackService(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    public Feedback create(String id, String passengerId, String routeId,
                           int rating, String content) {
        if (repository.findById(id).isPresent()) {
            throw new IllegalArgumentException("Mã phản ánh đã tồn tại.");
        }
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Đánh giá phải từ 1 đến 5 sao.");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Nội dung phản ánh không được để trống.");
        }

        Feedback feedback = new Feedback(
                id, passengerId, routeId, rating, content
        );
        repository.save(feedback);

        auditLogService.log(passengerId, "GUI_PHAN_ANH_DANH_GIA");
        return feedback;
    }

    public List<Feedback> getAll() {
        return repository.findAll();
    }

    public Feedback getById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phản ánh."));
    }

    public void updateStatus(String id, FeedbackStatus status) {
        Feedback feedback = getById(id);
        feedback.setStatus(status);

        auditLogService.log("manager", "CAP_NHAT_TRANG_THAI_PHAN_ANH");
    }
}
