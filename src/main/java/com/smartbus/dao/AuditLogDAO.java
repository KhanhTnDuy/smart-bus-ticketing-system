package com.smartbus.dao;

import com.smartbus.model.AuditLog;
import com.smartbus.util.DBConnection;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO: Truy vấn và ghi nhật ký thao tác hệ thống
 */
public class AuditLogDAO {

    private static final int PAGE_SIZE = 10;

    // =========================================================
    // QUERY: Lấy danh sách audit log có lọc & phân trang
    // =========================================================
    public List<AuditLog> findAll(String username, String actionType, String status,
                                   String fromDate, String toDate, int page) throws SQLException {
        List<AuditLog> list = new ArrayList<>();

        StringBuilder sql = new StringBuilder(
            "SELECT * FROM audit_logs WHERE 1=1 "
        );

        List<Object> params = buildParams(sql, username, actionType, status, fromDate, toDate);
        sql.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
        params.add(PAGE_SIZE);
        params.add((page - 1) * PAGE_SIZE);

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = buildPS(conn, sql.toString(), params);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                list.add(mapRow(rs));
            }
        }
        return list;
    }

    // =========================================================
    // QUERY: Đếm tổng bản ghi (phân trang)
    // =========================================================
    public int countAll(String username, String actionType, String status,
                         String fromDate, String toDate) throws SQLException {
        StringBuilder sql = new StringBuilder(
            "SELECT COUNT(*) FROM audit_logs WHERE 1=1 "
        );
        List<Object> params = buildParams(sql, username, actionType, status, fromDate, toDate);

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = buildPS(conn, sql.toString(), params);
             ResultSet rs = ps.executeQuery()) {

            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    // =========================================================
    // INSERT: Ghi một log mới
    // =========================================================
    public void insert(AuditLog log) throws SQLException {
        String sql = "INSERT INTO audit_logs " +
                     "(user_id, username, action, action_type, target_resource, ip_address, " +
                     " user_agent, status, details) VALUES (?,?,?,?,?,?,?,?,?)";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, log.getUserId());
            ps.setString(2, log.getUsername());
            ps.setString(3, log.getAction());
            ps.setString(4, log.getActionType());
            ps.setString(5, log.getTargetResource());
            ps.setString(6, log.getIpAddress());
            ps.setString(7, log.getUserAgent());
            ps.setString(8, log.getStatus() != null ? log.getStatus() : "SUCCESS");
            ps.setString(9, log.getDetails());
            ps.executeUpdate();
        }
    }

    // =========================================================
    // QUERY: Thống kê số lượng theo action type (dùng cho dashboard)
    // =========================================================
    public List<Object[]> countByActionType() throws SQLException {
        List<Object[]> result = new ArrayList<>();
        String sql = "SELECT action_type, COUNT(*) as cnt FROM audit_logs " +
                     "GROUP BY action_type ORDER BY cnt DESC";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                result.add(new Object[]{rs.getString("action_type"), rs.getLong("cnt")});
            }
        }
        return result;
    }

    // =========================================================
    // Helpers
    // =========================================================
    private List<Object> buildParams(StringBuilder sql, String username, String actionType,
                                      String status, String fromDate, String toDate) {
        List<Object> params = new ArrayList<>();

        if (username != null && !username.isBlank()) {
            sql.append(" AND username LIKE ?");
            params.add("%" + username.trim() + "%");
        }
        if (actionType != null && !actionType.isBlank()) {
            sql.append(" AND action_type = ?");
            params.add(actionType.trim());
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
        for (int i = 0; i < params.size(); i++) {
            ps.setObject(i + 1, params.get(i));
        }
        return ps;
    }

    private AuditLog mapRow(ResultSet rs) throws SQLException {
        AuditLog log = new AuditLog();
        log.setId(rs.getLong("id"));
        log.setUserId(rs.getObject("user_id", Integer.class));
        log.setUsername(rs.getString("username"));
        log.setAction(rs.getString("action"));
        log.setActionType(rs.getString("action_type"));
        log.setTargetResource(rs.getString("target_resource"));
        log.setIpAddress(rs.getString("ip_address"));
        log.setUserAgent(rs.getString("user_agent"));
        log.setStatus(rs.getString("status"));
        log.setDetails(rs.getString("details"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) log.setCreatedAt(ts.toLocalDateTime());
        return log;
    }

    public int getPageSize() {
        return PAGE_SIZE;
    }
}
