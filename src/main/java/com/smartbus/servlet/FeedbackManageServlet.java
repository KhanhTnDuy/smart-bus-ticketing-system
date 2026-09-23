package com.smartbus.servlet;

import com.smartbus.dao.FeedbackDAO;
import com.smartbus.model.Feedback;
import com.smartbus.util.DBConnection;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

/**
 * Servlet: Quản lý danh sách phản ánh (Admin)
 * GET /admin/feedbacks → bảng danh sách có lọc & phân trang
 */
public class FeedbackManageServlet extends HttpServlet {

    private FeedbackDAO feedbackDAO;

    @Override
    public void init() throws ServletException {
        DBConnection.init(getServletContext());
        feedbackDAO = new FeedbackDAO();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        req.setCharacterEncoding("UTF-8");

        // ── Bộ lọc ──────────────────────────────────────────
        String type     = req.getParameter("type");
        String status   = req.getParameter("status");
        String fromDate = req.getParameter("fromDate");
        String toDate   = req.getParameter("toDate");

        // ── Phân trang ───────────────────────────────────────
        int page = 1;
        try {
            String p = req.getParameter("page");
            if (p != null) page = Math.max(1, Integer.parseInt(p));
        } catch (NumberFormatException ignored) {}

        try {
            List<Feedback> feedbacks = feedbackDAO.findAll(type, status, fromDate, toDate, page);
            int total      = feedbackDAO.countAll(type, status, fromDate, toDate);
            int totalPages = (int) Math.ceil((double) total / feedbackDAO.getPageSize());
            int[] statusCounts = feedbackDAO.getStatusCounts();

            req.setAttribute("feedbacks",       feedbacks);
            req.setAttribute("total",           total);
            req.setAttribute("page",            page);
            req.setAttribute("totalPages",      totalPages);
            req.setAttribute("pageSize",        feedbackDAO.getPageSize());
            req.setAttribute("pendingCount",    statusCounts[0]);
            req.setAttribute("processingCount", statusCounts[1]);
            req.setAttribute("resolvedCount",   statusCounts[2]);

            // Trả lại bộ lọc
            req.setAttribute("fType",     type);
            req.setAttribute("fStatus",   status);
            req.setAttribute("fFromDate", fromDate);
            req.setAttribute("fToDate",   toDate);

        } catch (Exception e) {
            req.setAttribute("errorMsg", "Lỗi khi tải danh sách phản ánh: " + e.getMessage());
        }

        req.getRequestDispatcher("/views/feedback/feedback_manage.jsp").forward(req, resp);
    }
}
