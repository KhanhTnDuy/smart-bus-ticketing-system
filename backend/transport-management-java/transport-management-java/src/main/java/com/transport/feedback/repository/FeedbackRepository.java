package com.transport.feedback.repository;

import com.transport.feedback.model.Feedback;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class FeedbackRepository {
    private final List<Feedback> feedbacks = new ArrayList<>();

    public void save(Feedback feedback) {
        feedbacks.add(feedback);
    }

    public Optional<Feedback> findById(String id) {
        return feedbacks.stream()
                .filter(f -> f.getId().equalsIgnoreCase(id))
                .findFirst();
    }

    public List<Feedback> findAll() {
        return new ArrayList<>(feedbacks);
    }
}
