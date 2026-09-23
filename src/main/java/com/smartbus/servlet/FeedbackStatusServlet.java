package com.smartbus.servlet;

import com.google.gson.JsonObject;
import com.smartbus.dao.AuditLogDAO;
import com.smartbus.dao.FeedbackDAO;
import com.smartbus.model.AuditLog;
import com.smartbus.util.DBConnection;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

/**
 * Servlet: Cập nhật trạng thái phản ánh (AJAX)
 * POST /admin/feedback-status
 * Params: feedbackId, newStatus, adminResponse
 * Response: JSON { success: true/false, message: "..." }
 */
public class FeedbackStatusServlet extends HttpServlet {

    private FeedbackDAO  feedbackDAO;
    private AuditLogDAO  auditLogDAO;

    @Override
    public void init() throws ServletException {
        DBConnection.init(getServletContext());
        feedbackDAO = new FeedbackDAO();
        auditLogDAO = new AuditLogDAO();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        req.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json;charset=UTF-8");

        JsonObject json = new JsonObject();
        PrintWriter out = resp.getWriter();

        try {
            String idStr         = req.getParameter("feedbackId");
            String newStatus     = req.getParameter("newStatus");
            String adminResponse = req.getParameter("adminResponse");

            // Validation
            if (idStr == null || newStatus == null) {
                throw new IllegalArgumentException("Thiếu tham số bắt buộc.");
            }
            long feedbackId = Long.parseLong(idStr);
            if (!newStatus.matches("PENDING|PROCESSING|RESOLVED")) {
                throw new IllegalArgumentException("Trạng thái không hợp lệ: " + newStatus);
            }

            // Admin hiện tại (trong thực tế lấy từ session)
            String processedBy = "admin";

            boolean ok = feedbackDAO.updateStatus(feedbackId, newStatus, adminResponse, processedBy);

            if (ok) {
                // Ghi audit log
                AuditLog log = new AuditLog();
                log.setUsername(processedBy);
                log.setAction("Cập nhật trạng thái phản ánh #" + feedbackId + " → " + newStatus);
                log.setActionType("STATUS_CHANGE");
                log.setTargetResource("/admin/feedback-status");
                log.setIpAddress(req.getRemoteAddr());
                log.setStatus("SUCCESS");
                log.setDetails("Feedback ID: " + feedbackId + ", New status: " + newStatus);
                auditLogDAO.insert(log);

                json.addProperty("success", true);
                json.addProperty("message", "Cập nhật trạng thái thành công!");
                json.addProperty("newStatus", newStatus);
                json.addProperty("newStatusLabel", statusLabel(newStatus));
            } else {
                json.addProperty("success", false);
                json.addProperty("message", "Không tìm thấy phản ánh với ID: " + feedbackId);
            }

        } catch (IllegalArgumentException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            json.addProperty("success", false);
            json.addProperty("message", e.getMessage());
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            json.addProperty("success", false);
            json.addProperty("message", "Lỗi hệ thống: " + e.getMessage());
        }

        out.print(json.toString());
        out.flush();
    }

    private String statusLabel(String status) {
        return switch (status) {
            case "PENDING"    -> "Chưa xử lý";
            case "PROCESSING" -> "Đang xử lý";
            case "RESOLVED"   -> "Đã xử lý";
            default           -> status;
        };
    }
}
