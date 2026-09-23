package com.smartbus.servlet;

import com.smartbus.dao.AuditLogDAO;
import com.smartbus.model.AuditLog;
import com.smartbus.util.DBConnection;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

/**
 * Servlet: Quản lý nhật ký hệ thống (Admin)
 * GET  /admin/audit-log  → hiển thị bảng có lọc và phân trang
 */
public class AuditLogServlet extends HttpServlet {

    private AuditLogDAO auditLogDAO;

    @Override
    public void init() throws ServletException {
        DBConnection.init(getServletContext());
        auditLogDAO = new AuditLogDAO();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        req.setCharacterEncoding("UTF-8");

        // ── Bộ lọc ──────────────────────────────────────────
        String username   = req.getParameter("username");
        String actionType = req.getParameter("actionType");
        String status     = req.getParameter("status");
        String fromDate   = req.getParameter("fromDate");
        String toDate     = req.getParameter("toDate");

        // ── Phân trang ───────────────────────────────────────
        int page = 1;
        try {
            String p = req.getParameter("page");
            if (p != null) page = Math.max(1, Integer.parseInt(p));
        } catch (NumberFormatException ignored) {}

        try {
            List<AuditLog> logs = auditLogDAO.findAll(username, actionType, status, fromDate, toDate, page);
            int total     = auditLogDAO.countAll(username, actionType, status, fromDate, toDate);
            int totalPages = (int) Math.ceil((double) total / auditLogDAO.getPageSize());

            req.setAttribute("logs",       logs);
            req.setAttribute("total",      total);
            req.setAttribute("page",       page);
            req.setAttribute("totalPages", totalPages);
            req.setAttribute("pageSize",   auditLogDAO.getPageSize());

            // Trả lại giá trị bộ lọc để hiển thị lại trên form
            req.setAttribute("fUsername",   username);
            req.setAttribute("fActionType", actionType);
            req.setAttribute("fStatus",     status);
            req.setAttribute("fFromDate",   fromDate);
            req.setAttribute("fToDate",     toDate);

        } catch (Exception e) {
            req.setAttribute("errorMsg", "Lỗi khi truy vấn nhật ký: " + e.getMessage());
        }

        req.getRequestDispatcher("/views/audit/audit_log.jsp").forward(req, resp);
    }
}
