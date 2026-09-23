package com.smartbus.dao;

import com.smartbus.model.Feedback;
import com.smartbus.model.FeedbackHistory;
import com.smartbus.util.DBConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO: Thao tác CRUD với bảng feedbacks và feedback_history
 */
public class FeedbackDAO {

    private static final int PAGE_SIZE = 10;

    // =========================================================
    // QUERY: Danh sách phản ánh có lọc & phân trang
    // =========================================================
    public List<Feedback> findAll(String type, String status,
                                   String fromDate, String toDate, int page) throws SQLException {
        List<Feedback> list = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT * FROM feedbacks WHERE 1=1 ");
        List<Object> params = buildFilterParams(sql, type, status, fromDate, toDate);
        sql.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
        params.add(PAGE_SIZE);
        params.add((page - 1) * PAGE_SIZE);

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = buildPS(conn, sql.toString(), params);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) list.add(mapRow(rs));
        }
        return list;
    }

    // =========================================================
    // QUERY: Đếm tổng bản ghi
    // =========================================================
    public int countAll(String type, String status,
                         String fromDate, String toDate) throws SQLException {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM feedbacks WHERE 1=1 ");
        List<Object> params = buildFilterParams(sql, type, status, fromDate, toDate);

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = buildPS(conn, sql.toString(), params);
             ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    // =========================================================
    // QUERY: Lấy chi tiết một feedback theo ID
    // =========================================================
    public Feedback findById(long id) throws SQLException {
        String sql = "SELECT * FROM feedbacks WHERE id = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? mapRow(rs) : null;
            }
        }
    }

    // =========================================================
    // INSERT: Hành khách gửi phản ánh/đánh giá mới
    // =========================================================
    public long insert(Feedback fb) throws SQLException {
        String sql = "INSERT INTO feedbacks " +
                     "(passenger_id, passenger_name, passenger_email, passenger_phone, " +
                     " trip_id, trip_route, type, subject, content, rating, image_path, status) " +
                     "VALUES (?,?,?,?,?,?,?,?,?,?,?,'PENDING')";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setObject(1,  fb.getPassengerId());
            ps.setString(2,  fb.getPassengerName());
            ps.setString(3,  fb.getPassengerEmail());
            ps.setString(4,  fb.getPassengerPhone());
            ps.setString(5,  fb.getTripId());
            ps.setString(6,  fb.getTripRoute());
            ps.setString(7,  fb.getType());
            ps.setString(8,  fb.getSubject());
            ps.setString(9,  fb.getContent());
            ps.setObject(10, fb.getRating());
            ps.setString(11, fb.getImagePath());
            ps.executeUpdate();

            try (ResultSet keys = ps.getGeneratedKeys()) {
                return keys.next() ? keys.getLong(1) : -1;
            }
        }
    }

    // =========================================================
    // UPDATE: Cập nhật trạng thái và phản hồi của admin
    // =========================================================
    public boolean updateStatus(long feedbackId, String newStatus,
                                  String adminResponse, String processedBy) throws SQLException {
        String sql = "UPDATE feedbacks SET status = ?, admin_response = ?, " +
                     "processed_by = ?, updated_at = NOW() WHERE id = ?";

        try (Connection conn = DBConnection.getConnection()) {
            // 1. Lấy trạng thái cũ để ghi history
            String oldStatus = null;
            try (PreparedStatement ps = conn.prepareStatement("SELECT status FROM feedbacks WHERE id = ?")) {
                ps.setLong(1, feedbackId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) oldStatus = rs.getString("status");
                }
            }

            // 2. Cập nhật trạng thái
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, newStatus);
                ps.setString(2, adminResponse);
                ps.setString(3, processedBy);
                ps.setLong(4, feedbackId);
                int rows = ps.executeUpdate();
                if (rows == 0) return false;
            }

            // 3. Ghi lịch sử thay đổi
            insertHistory(conn, feedbackId, oldStatus, newStatus, processedBy, null);
            return true;
        }
    }

    // =========================================================
    // QUERY: Lịch sử thay đổi trạng thái của một feedback
    // =========================================================
    public List<FeedbackHistory> getHistory(long feedbackId) throws SQLException {
        List<FeedbackHistory> list = new ArrayList<>();
        String sql = "SELECT * FROM feedback_history WHERE feedback_id = ? ORDER BY changed_at ASC";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, feedbackId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    FeedbackHistory h = new FeedbackHistory();
                    h.setId(rs.getLong("id"));
                    h.setFeedbackId(rs.getLong("feedback_id"));
                    h.setOldStatus(rs.getString("old_status"));
                    h.setNewStatus(rs.getString("new_status"));
                    h.setChangedBy(rs.getString("changed_by"));
                    h.setNote(rs.getString("note"));
                    Timestamp ts = rs.getTimestamp("changed_at");
                    if (ts != null) h.setChangedAt(ts.toLocalDateTime());
                    list.add(h);
                }
            }
        }
        return list;
    }

    // =========================================================
    // Thống kê tổng quan (dùng cho dashboard)
    // =========================================================
    public int[] getStatusCounts() throws SQLException {
        // [0]=PENDING, [1]=PROCESSING, [2]=RESOLVED
        int[] counts = {0, 0, 0};
        String sql = "SELECT status, COUNT(*) as cnt FROM feedbacks GROUP BY status";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String s = rs.getString("status");
                int cnt = rs.getInt("cnt");
                if ("PENDING".equals(s))    counts[0] = cnt;
                if ("PROCESSING".equals(s)) counts[1] = cnt;
                if ("RESOLVED".equals(s))   counts[2] = cnt;
            }
        }
        return counts;
    }

    // =========================================================
    // Helpers
    // =========================================================
    private void insertHistory(Connection conn, long feedbackId, String oldStatus,
                                String newStatus, String changedBy, String note) throws SQLException {
        String sql = "INSERT INTO feedback_history (feedback_id, old_status, new_status, changed_by, note) " +
                     "VALUES (?,?,?,?,?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, feedbackId);
            ps.setString(2, oldStatus);
            ps.setString(3, newStatus);
            ps.setString(4, changedBy);
            ps.setString(5, note);
            ps.executeUpdate();
        }
    }

    private List<Object> buildFilterParams(StringBuilder sql, String type, String status,
                                            String fromDate, String toDate) {
        List<Object> params = new ArrayList<>();
        if (type != null && !type.isBlank()) {
            sql.append(" AND type = ?");
            params.add(type.trim());
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = ?");
            params.add(status.trim());
        }
        if (fromDate != null && !fromDate.isBlank()) {
            sql.append(" AND DATE(created_at) >= ?");
            params.add(fromDate.trim());
        }
        if (toDate != null && !toDate.isBlank()) {
            sql.append(" AND DATE(created_at) <= ?");
            params.add(toDate.trim());
        }
        return params;
    }

    private PreparedStatement buildPS(Connection conn, String sql, List<Object> params)
            throws SQLException {
        PreparedStatement ps = conn.prepareStatement(sql);
        for (int i = 0; i < params.size(); i++) ps.setObject(i + 1, params.get(i));
        return ps;
    }

    private Feedback mapRow(ResultSet rs) throws SQLException {
        Feedback fb = new Feedback();
        fb.setId(rs.getLong("id"));
        fb.setPassengerId(rs.getObject("passenger_id", Integer.class));
        fb.setPassengerName(rs.getString("passenger_name"));
        fb.setPassengerEmail(rs.getString("passenger_email"));
        fb.setPassengerPhone(rs.getString("passenger_phone"));
        fb.setTripId(rs.getString("trip_id"));
        fb.setTripRoute(rs.getString("trip_route"));
        fb.setType(rs.getString("type"));
        fb.setSubject(rs.getString("subject"));
        fb.setContent(rs.getString("content"));
        Object rating = rs.getObject("rating");
        fb.setRating(rating != null ? ((Number) rating).intValue() : null);
        fb.setImagePath(rs.getString("image_path"));
        fb.setStatus(rs.getString("status"));
        fb.setAdminResponse(rs.getString("admin_response"));
        fb.setProcessedBy(rs.getString("processed_by"));
        Timestamp ca = rs.getTimestamp("created_at");
        if (ca != null) fb.setCreatedAt(ca.toLocalDateTime());
        Timestamp ua = rs.getTimestamp("updated_at");
        if (ua != null) fb.setUpdatedAt(ua.toLocalDateTime());
        return fb;
    }

    public int getPageSize() { return PAGE_SIZE; }
}
