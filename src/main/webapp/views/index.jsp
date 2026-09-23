<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%
    request.setAttribute("pageTitle", "Dashboard");
    request.setAttribute("breadcrumb",
        "<nav aria-label='breadcrumb'><ol class='breadcrumb mb-0'>" +
        "<li class='breadcrumb-item active'>Dashboard</li></ol></nav>");
%>
<%@ include file="/views/layout/header.jsp" %>

<div class="container-fluid py-4">

    <!-- Page Title -->
    <div class="page-header mb-4">
        <h1 class="page-title">
            <i class="fas fa-tachometer-alt me-2 text-primary"></i>Dashboard
        </h1>
        <p class="text-muted mb-0">Tổng quan hệ thống Smart Bus Ticketing — Module Nhật ký & Phản ánh</p>
    </div>

    <!-- ── Stat Cards ──────────────────────────────────────── -->
    <div class="row g-4 mb-4">

        <div class="col-xl-3 col-md-6">
            <div class="stat-card stat-card--warning">
                <div class="stat-icon"><i class="fas fa-clock"></i></div>
                <div class="stat-body">
                    <div class="stat-value"><c:out value="${pendingCount}" default="0"/></div>
                    <div class="stat-label">Chưa xử lý</div>
                </div>
                <a href="${pageContext.request.contextPath}/admin/feedbacks?status=PENDING" class="stat-link">
                    Xem ngay <i class="fas fa-arrow-right ms-1"></i>
                </a>
            </div>
        </div>

        <div class="col-xl-3 col-md-6">
            <div class="stat-card stat-card--primary">
                <div class="stat-icon"><i class="fas fa-spinner"></i></div>
                <div class="stat-body">
                    <div class="stat-value"><c:out value="${processingCount}" default="0"/></div>
                    <div class="stat-label">Đang xử lý</div>
                </div>
                <a href="${pageContext.request.contextPath}/admin/feedbacks?status=PROCESSING" class="stat-link">
                    Xem ngay <i class="fas fa-arrow-right ms-1"></i>
                </a>
            </div>
        </div>

        <div class="col-xl-3 col-md-6">
            <div class="stat-card stat-card--success">
                <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                <div class="stat-body">
                    <div class="stat-value"><c:out value="${resolvedCount}" default="0"/></div>
                    <div class="stat-label">Đã xử lý</div>
                </div>
                <a href="${pageContext.request.contextPath}/admin/feedbacks?status=RESOLVED" class="stat-link">
                    Xem ngay <i class="fas fa-arrow-right ms-1"></i>
                </a>
            </div>
        </div>

        <div class="col-xl-3 col-md-6">
            <div class="stat-card stat-card--info">
                <div class="stat-icon"><i class="fas fa-comments"></i></div>
                <div class="stat-body">
                    <div class="stat-value"><c:out value="${totalFeedback}" default="0"/></div>
                    <div class="stat-label">Tổng phản ánh</div>
                </div>
                <a href="${pageContext.request.contextPath}/admin/feedbacks" class="stat-link">
                    Xem tất cả <i class="fas fa-arrow-right ms-1"></i>
                </a>
            </div>
        </div>
    </div>

    <!-- ── Quick Actions ───────────────────────────────────── -->
    <div class="row g-4">
        <div class="col-lg-8">
            <div class="card card-custom h-100">
                <div class="card-header-custom">
                    <i class="fas fa-bolt me-2 text-warning"></i>Truy cập nhanh
                </div>
                <div class="card-body p-4">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <a href="${pageContext.request.contextPath}/admin/audit-log" 
                               class="quick-action-card">
                                <div class="qa-icon bg-primary-subtle">
                                    <i class="fas fa-history text-primary"></i>
                                </div>
                                <div class="qa-body">
                                    <div class="qa-title">Nhật ký hệ thống</div>
                                    <div class="qa-desc">Xem và lọc audit log</div>
                                </div>
                                <i class="fas fa-chevron-right text-muted"></i>
                            </a>
                        </div>
                        <div class="col-md-6">
                            <a href="${pageContext.request.contextPath}/admin/feedbacks" 
                               class="quick-action-card">
                                <div class="qa-icon bg-success-subtle">
                                    <i class="fas fa-comments text-success"></i>
                                </div>
                                <div class="qa-body">
                                    <div class="qa-title">Quản lý phản ánh</div>
                                    <div class="qa-desc">Duyệt khiếu nại & đánh giá</div>
                                </div>
                                <i class="fas fa-chevron-right text-muted"></i>
                            </a>
                        </div>
                        <div class="col-md-6">
                            <a href="${pageContext.request.contextPath}/feedback/submit" 
                               class="quick-action-card">
                                <div class="qa-icon bg-warning-subtle">
                                    <i class="fas fa-paper-plane text-warning"></i>
                                </div>
                                <div class="qa-body">
                                    <div class="qa-title">Gửi phản ánh</div>
                                    <div class="qa-desc">Form cho hành khách</div>
                                </div>
                                <i class="fas fa-chevron-right text-muted"></i>
                            </a>
                        </div>
                        <div class="col-md-6">
                            <a href="${pageContext.request.contextPath}/admin/feedbacks?type=COMPLAINT&status=PENDING" 
                               class="quick-action-card">
                                <div class="qa-icon bg-danger-subtle">
                                    <i class="fas fa-exclamation-triangle text-danger"></i>
                                </div>
                                <div class="qa-body">
                                    <div class="qa-title">Khiếu nại chờ xử lý</div>
                                    <div class="qa-desc">Cần phản hồi ngay</div>
                                </div>
                                <i class="fas fa-chevron-right text-muted"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-4">
            <div class="card card-custom h-100">
                <div class="card-header-custom">
                    <i class="fas fa-info-circle me-2 text-info"></i>Thông tin module
                </div>
                <div class="card-body p-4">
                    <div class="module-info-list">
                        <div class="module-info-item">
                            <i class="fas fa-check text-success me-2"></i>
                            Quản lý nhật ký hệ thống (Audit Log)
                        </div>
                        <div class="module-info-item">
                            <i class="fas fa-check text-success me-2"></i>
                            Bộ lọc nâng cao &amp; phân trang
                        </div>
                        <div class="module-info-item">
                            <i class="fas fa-check text-success me-2"></i>
                            Form gửi khiếu nại / đánh giá sao
                        </div>
                        <div class="module-info-item">
                            <i class="fas fa-check text-success me-2"></i>
                            Đính kèm ảnh minh họa
                        </div>
                        <div class="module-info-item">
                            <i class="fas fa-check text-success me-2"></i>
                            Quản lý phản ánh (Admin)
                        </div>
                        <div class="module-info-item">
                            <i class="fas fa-check text-success me-2"></i>
                            Cập nhật trạng thái thời gian thực
                        </div>
                        <div class="module-info-item">
                            <i class="fas fa-check text-success me-2"></i>
                            Timeline lịch sử thay đổi trạng thái
                        </div>
                    </div>
                    <div class="mt-3 p-3 bg-primary-subtle rounded">
                        <small class="text-primary fw-semibold">
                            <i class="fas fa-code-branch me-1"></i>
                            Thành viên C — Smart Bus Ticketing System
                        </small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<%@ include file="/views/layout/footer.jsp" %>
