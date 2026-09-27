package com.transport.feedback.service;

import com.transport.audit.service.AuditLogService;
import com.transport.feedback.model.Feedback;
import com.transport.feedback.model.FeedbackStatus;
import com.transport.feedback.repository.FeedbackRepository;
import com.transport.route.service.RouteService;

import java.util.List;

public class FeedbackService {
    private final FeedbackRepository repository = new FeedbackRepository();
    private final AuditLogService auditLogService;
    private final RouteService routeService;

    public FeedbackService(AuditLogService auditLogService, RouteService routeService) {
        this.auditLogService = auditLogService;
        this.routeService = routeService;
    }

    /**
     * SCRUM-21: Gửi khiếu nại/phản ánh về chuyến đi. Không bắt buộc chấm sao —
     * hành khách chỉ cần nhập nội dung phản ánh.
     */
    public Feedback create(String id, String passengerId, String routeId, String content) {
        return create(id, passengerId, routeId, null, content);
    }

    /**
     * SCRUM-22: Đánh giá chuyến đi kèm số sao (dùng chung luồng tạo với SCRUM-21,
     * chỉ khác là có rating). rating null nghĩa là chưa chấm sao (thuần khiếu nại).
     */
    public Feedback create(String id, String passengerId, String routeId, Integer rating, String content) {
        if (repository.findById(id).isPresent()) {
            throw new IllegalArgumentException("Mã phản ánh đã tồn tại.");
        }
        if (passengerId == null || passengerId.isBlank()) {
            throw new IllegalArgumentException("Thiếu thông tin hành khách gửi phản ánh.");
        }
        if (rating != null && (rating < 1 || rating > 5)) {
            throw new IllegalArgumentException("Đánh giá phải từ 1 đến 5 sao.");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Nội dung phản ánh không được để trống.");
        }
        // SCRUM-21: kiểm tra routeId có tồn tại không (routeService.getById tự ném
        // lỗi "Không tìm thấy tuyến." nếu không hợp lệ).
        routeService.getById(routeId);

        Feedback feedback = new Feedback(id, passengerId, routeId, rating, content);
        repository.save(feedback);

        auditLogService.log(passengerId, rating == null ? "GUI_PHAN_ANH" : "GUI_PHAN_ANH_DANH_GIA");
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
