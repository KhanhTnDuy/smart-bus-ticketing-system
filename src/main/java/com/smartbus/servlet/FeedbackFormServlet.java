package com.smartbus.servlet;

import com.smartbus.dao.AuditLogDAO;
import com.smartbus.dao.FeedbackDAO;
import com.smartbus.model.AuditLog;
import com.smartbus.model.Feedback;
import com.smartbus.util.DBConnection;
import com.smartbus.util.FileUploadUtil;

import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import java.io.IOException;

/**
 * Servlet: Form gửi phản ánh và đánh giá (Hành khách)
 * GET  /feedback/submit  → hiển thị form
 * POST /feedback/submit  → xử lý gửi phản ánh
 */
public class FeedbackFormServlet extends HttpServlet {

    private FeedbackDAO  feedbackDAO;
    private AuditLogDAO  auditLogDAO;
    private String       uploadDir;

    @Override
    public void init() throws ServletException {
        DBConnection.init(getServletContext());
        feedbackDAO = new FeedbackDAO();
        auditLogDAO = new AuditLogDAO();

        String uploadParam = getServletContext().getInitParameter("UPLOAD_DIR");
        uploadDir = getServletContext().getRealPath("") + java.io.File.separator + uploadParam;
    }

    // ── GET: Hiển thị form ───────────────────────────────────
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        req.getRequestDispatcher("/views/feedback/feedback_form.jsp").forward(req, resp);
    }

    // ── POST: Xử lý submit form ─────────────────────────────
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        req.setCharacterEncoding("UTF-8");

        try {
            Feedback fb = new Feedback();

            // ── Thông tin hành khách ────────────────────────
            fb.setPassengerName(sanitize(req.getParameter("passengerName")));
            fb.setPassengerEmail(sanitize(req.getParameter("passengerEmail")));
            fb.setPassengerPhone(sanitize(req.getParameter("passengerPhone")));

            // ── Chuyến đi ──────────────────────────────────
            fb.setTripId(sanitize(req.getParameter("tripId")));
            fb.setTripRoute(sanitize(req.getParameter("tripRoute")));

            // ── Loại phản ánh ──────────────────────────────
            String type = req.getParameter("type");
            if (!"COMPLAINT".equals(type) && !"REVIEW".equals(type)) {
                throw new IllegalArgumentException("Loại phản ánh không hợp lệ.");
            }
            fb.setType(type);

            fb.setSubject(sanitize(req.getParameter("subject")));
            fb.setContent(sanitize(req.getParameter("content")));

            // ── Đánh giá sao (chỉ khi REVIEW) ─────────────
            if ("REVIEW".equals(type)) {
                String ratingStr = req.getParameter("rating");
                if (ratingStr != null && !ratingStr.isBlank()) {
                    int rating = Integer.parseInt(ratingStr);
                    if (rating < 1 || rating > 5) throw new IllegalArgumentException("Đánh giá phải từ 1–5 sao.");
                    fb.setRating(rating);
                }
            }

            // ── Upload ảnh đính kèm ─────────────────────────
            try {
                Part imagePart = req.getPart("image");
                String savedName = FileUploadUtil.saveFile(imagePart, uploadDir);
                fb.setImagePath(savedName);
            } catch (IllegalArgumentException ex) {
                req.setAttribute("errorMsg", ex.getMessage());
                req.setAttribute("formData", fb);
                req.getRequestDispatcher("/views/feedback/feedback_form.jsp").forward(req, resp);
                return;
            }

            // ── Validation cơ bản ───────────────────────────
            if (fb.getPassengerName() == null || fb.getPassengerName().isBlank()) {
                throw new IllegalArgumentException("Vui lòng nhập họ tên hành khách.");
            }
            if (fb.getContent() == null || fb.getContent().isBlank()) {
                throw new IllegalArgumentException("Vui lòng nhập nội dung phản ánh.");
            }

            // ── Lưu vào DB ──────────────────────────────────
            long newId = feedbackDAO.insert(fb);

            // ── Ghi audit log ────────────────────────────────
            AuditLog log = new AuditLog();
            log.setUsername(fb.getPassengerName());
            log.setAction("Gửi " + fb.getTypeLabel() + ": " + (fb.getSubject() != null ? fb.getSubject() : "(không có tiêu đề)"));
            log.setActionType("FEEDBACK_SUBMIT");
            log.setTargetResource("/feedback/submit");
            log.setIpAddress(req.getRemoteAddr());
            log.setUserAgent(req.getHeader("User-Agent"));
            log.setStatus("SUCCESS");
            log.setDetails("Feedback ID: " + newId);
            auditLogDAO.insert(log);

            req.setAttribute("successMsg", "Phản ánh của bạn đã được gửi thành công! Mã phản ánh: #" + newId);
            req.getRequestDispatcher("/views/feedback/feedback_form.jsp").forward(req, resp);

        } catch (IllegalArgumentException e) {
            req.setAttribute("errorMsg", e.getMessage());
            req.getRequestDispatcher("/views/feedback/feedback_form.jsp").forward(req, resp);
        } catch (Exception e) {
            req.setAttribute("errorMsg", "Đã xảy ra lỗi hệ thống: " + e.getMessage());
            req.getRequestDispatcher("/views/feedback/feedback_form.jsp").forward(req, resp);
        }
    }

    private String sanitize(String s) {
        return (s != null) ? s.trim() : null;
    }
}
