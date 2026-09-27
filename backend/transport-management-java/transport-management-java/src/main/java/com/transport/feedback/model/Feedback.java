package com.transport.feedback.model;

public class Feedback {
    private String id;
    private String passengerId;
    private String routeId;
    // SCRUM-21: khiếu nại/phản ánh không bắt buộc chấm sao, nên rating là tuỳ chọn.
    // null = chưa có đánh giá sao (SCRUM-22 có thể bổ sung sau qua setRating()).
    private Integer rating;
    private String content;
    private FeedbackStatus status;

    public Feedback(String id, String passengerId, String routeId,
                    Integer rating, String content) {
        this.id = id;
        this.passengerId = passengerId;
        this.routeId = routeId;
        this.rating = rating;
        this.content = content;
        this.status = FeedbackStatus.CHUA_XU_LY;
    }

    public String getId() { return id; }
    public String getPassengerId() { return passengerId; }
    public String getRouteId() { return routeId; }
    public Integer getRating() { return rating; }
    public String getContent() { return content; }
    public FeedbackStatus getStatus() { return status; }

    public void setStatus(FeedbackStatus status) {
        this.status = status;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    @Override
    public String toString() {
        return String.format(
                "Feedback{id='%s', passenger='%s', route='%s', rating=%s, status=%s, content='%s'}",
                id, passengerId, routeId, rating == null ? "chưa đánh giá" : rating + "/5", status, content
        );
    }
}
