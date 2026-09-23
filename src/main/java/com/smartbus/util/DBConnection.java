package com.smartbus.util;

import javax.servlet.ServletContext;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Tiện ích kết nối cơ sở dữ liệu MySQL
 * Sử dụng cấu hình từ context-param trong web.xml
 */
public class DBConnection {

    private static String dbUrl;
    private static String dbUser;
    private static String dbPassword;

    /**
     * Khởi tạo cấu hình DB từ ServletContext (gọi trong Servlet init)
     */
    public static void init(ServletContext ctx) {
        dbUrl      = ctx.getInitParameter("DB_URL");
        dbUser     = ctx.getInitParameter("DB_USER");
        dbPassword = ctx.getInitParameter("DB_PASSWORD");

        // Load MySQL driver
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new RuntimeException("Không tìm thấy MySQL JDBC Driver", e);
        }
    }

    /**
     * Lấy một Connection từ DriverManager
     */
    public static Connection getConnection() throws SQLException {
        if (dbUrl == null) {
            throw new SQLException("DBConnection chưa được khởi tạo. Gọi DBConnection.init(ctx) trước.");
        }
        return DriverManager.getConnection(dbUrl, dbUser, dbPassword);
    }

    /**
     * Đóng connection an toàn (tránh NullPointerException)
     */
    public static void close(Connection conn) {
        if (conn != null) {
            try {
                conn.close();
            } catch (SQLException ignored) {}
        }
    }
}
