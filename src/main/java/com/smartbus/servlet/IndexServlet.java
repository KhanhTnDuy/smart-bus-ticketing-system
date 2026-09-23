package com.smartbus.servlet;

import com.smartbus.dao.FeedbackDAO;
import com.smartbus.util.DBConnection;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Servlet: Trang chính / Dashboard
 */
public class IndexServlet extends HttpServlet {

    @Override
    public void init() throws ServletException {
        DBConnection.init(getServletContext());
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        // Thống kê tổng quan feedback
        try {
            FeedbackDAO feedbackDAO = new FeedbackDAO();
            int[] statusCounts = feedbackDAO.getStatusCounts();
            req.setAttribute("pendingCount",    statusCounts[0]);
            req.setAttribute("processingCount", statusCounts[1]);
            req.setAttribute("resolvedCount",   statusCounts[2]);
            req.setAttribute("totalFeedback",   statusCounts[0] + statusCounts[1] + statusCounts[2]);
        } catch (Exception e) {
            req.setAttribute("dbError", e.getMessage());
        }

        req.getRequestDispatcher("/views/index.jsp").forward(req, resp);
    }
}
