package com.smartbus.servlet;

import com.smartbus.dao.FeedbackDAO;
import com.smartbus.model.Feedback;
import com.smartbus.model.FeedbackHistory;
import com.smartbus.util.DBConnection;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

/**
 * Servlet: Chi tiết phản ánh (Admin)
 * GET /admin/feedback-detail?id=X → xem chi tiết một feedback
 */
public class FeedbackDetailServlet extends HttpServlet {

    private FeedbackDAO feedbackDAO;

    @Override
    public void init() throws ServletException {
        DBConnection.init(getServletContext());
        feedbackDAO = new FeedbackDAO();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        String idStr = req.getParameter("id");
        if (idStr == null || idStr.isBlank()) {
            resp.sendRedirect(req.getContextPath() + "/admin/feedbacks");
            return;
        }

        try {
            long id = Long.parseLong(idStr);
            Feedback feedback            = feedbackDAO.findById(id);
            List<FeedbackHistory> history = feedbackDAO.getHistory(id);

            if (feedback == null) {
                req.setAttribute("errorMsg", "Không tìm thấy phản ánh #" + id);
                req.getRequestDispatcher("/views/feedback/feedback_detail.jsp").forward(req, resp);
                return;
            }

            req.setAttribute("feedback", feedback);
            req.setAttribute("history",  history);

        } catch (NumberFormatException e) {
            resp.sendRedirect(req.getContextPath() + "/admin/feedbacks");
            return;
        } catch (Exception e) {
            req.setAttribute("errorMsg", "Lỗi hệ thống: " + e.getMessage());
        }

        req.getRequestDispatcher("/views/feedback/feedback_detail.jsp").forward(req, resp);
    }
}
