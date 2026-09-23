package com.transport.feedback.model;

public class Feedback {
    private String id;
    private String passengerId;
    private String routeId;
    private int rating;
    private String content;
    private FeedbackStatus status;

    public Feedback(String id, String passengerId, String routeId,
                    int rating, String content) {
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
    public int getRating() { return rating; }
    public String getContent() { return content; }
    public FeedbackStatus getStatus() { return status; }

    public void setStatus(FeedbackStatus status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return String.format(
                "Feedback{id='%s', passenger='%s', route='%s', rating=%d/5, status=%s, content='%s'}",
                id, passengerId, routeId, rating, status, content
        );
    }
}
