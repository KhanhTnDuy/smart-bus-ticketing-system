package com.transport.feedback.controller;

import com.transport.feedback.model.Feedback;
import com.transport.feedback.model.FeedbackStatus;
import com.transport.feedback.service.FeedbackService;

public class FeedbackController {
    private final FeedbackService service;

    public FeedbackController(FeedbackService service) {
        this.service = service;
    }

    // SCRUM-21: gửi khiếu nại/phản ánh, không cần chấm sao
    public Feedback create(String id, String passengerId, String routeId, String content) {
        Feedback feedback = service.create(id, passengerId, routeId, content);
        System.out.println("[OK] Đã gửi phản ánh: " + id);
        return feedback;
    }

    // SCRUM-22: đánh giá chuyến đi kèm số sao
    public Feedback create(String id, String passengerId, String routeId, Integer rating, String content) {
        Feedback feedback = service.create(id, passengerId, routeId, rating, content);
        System.out.println("[OK] Đã gửi phản ánh: " + id);
        return feedback;
    }

    public void list() {
        System.out.println("Danh sách phản ánh:");
        service.getAll().forEach(feedback -> System.out.println("  " + feedback));
    }

    public void updateStatus(String id, FeedbackStatus status) {
        service.updateStatus(id, status);
        System.out.println("[OK] Phản ánh " + id + " -> " + status);
    }

    public void show(String id) {
        System.out.println("Chi tiết: " + service.getById(id));
    }
}
