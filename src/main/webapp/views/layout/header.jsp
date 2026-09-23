<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%
    String contextPath = request.getContextPath();
    String currentUri  = request.getRequestURI();
%>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= request.getAttribute("pageTitle") != null ? request.getAttribute("pageTitle") + " — " : "" %>Smart Bus Ticketing</title>

    <!-- Bootstrap 5.3 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome 6 -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Custom CSS -->
    <link href="<%= contextPath %>/assets/css/style.css" rel="stylesheet">
</head>
<body>

<!-- ── SIDEBAR ──────────────────────────────────────────── -->
<div class="sidebar" id="sidebar">
    <div class="sidebar-brand">
        <div class="brand-icon">
            <i class="fas fa-bus-alt"></i>
        </div>
        <div class="brand-text">
            <span class="brand-title">Smart Bus</span>
            <span class="brand-sub">Ticketing System</span>
        </div>
    </div>

    <div class="sidebar-divider"><span>QUẢN TRỊ HỆ THỐNG</span></div>

    <ul class="sidebar-nav">
        <li class="nav-item">
            <a href="<%= contextPath %>/" class="nav-link <%= currentUri.endsWith("/") || currentUri.endsWith("index.jsp") ? "active" : "" %>">
                <i class="fas fa-tachometer-alt nav-icon"></i>
                <span>Dashboard</span>
            </a>
        </li>
        <li class="nav-item">
            <a href="<%= contextPath %>/admin/audit-log" class="nav-link <%= currentUri.contains("audit-log") ? "active" : "" %>">
                <i class="fas fa-history nav-icon"></i>
                <span>Nhật ký hệ thống</span>
                <span class="badge bg-secondary ms-auto">Admin</span>
            </a>
        </li>
        <li class="nav-item">
            <a href="<%= contextPath %>/admin/feedbacks" class="nav-link <%= currentUri.contains("feedbacks") || currentUri.contains("feedback-detail") ? "active" : "" %>">
                <i class="fas fa-comments nav-icon"></i>
                <span>Quản lý phản ánh</span>
                <span class="badge bg-secondary ms-auto">Admin</span>
            </a>
        </li>
    </ul>

    <div class="sidebar-divider"><span>HÀNH KHÁCH</span></div>

    <ul class="sidebar-nav">
        <li class="nav-item">
            <a href="<%= contextPath %>/feedback/submit" class="nav-link <%= currentUri.contains("feedback/submit") ? "active" : "" %>">
                <i class="fas fa-paper-plane nav-icon"></i>
                <span>Gửi phản ánh / Đánh giá</span>
            </a>
        </li>
    </ul>
</div>

<!-- ── MAIN WRAPPER ──────────────────────────────────────── -->
<div class="main-wrapper" id="mainWrapper">
    <!-- TOP NAVBAR -->
    <nav class="topbar">
        <button class="btn-toggle-sidebar" id="sidebarToggle">
            <i class="fas fa-bars"></i>
        </button>

        <div class="topbar-breadcrumb">
            <%= request.getAttribute("breadcrumb") != null ? request.getAttribute("breadcrumb") : "" %>
        </div>

        <div class="topbar-right ms-auto d-flex align-items-center gap-3">
            <div class="topbar-time text-muted small">
                <i class="far fa-clock me-1"></i>
                <span id="currentTime"></span>
            </div>
            <div class="topbar-user dropdown">
                <button class="btn btn-sm btn-light dropdown-toggle d-flex align-items-center gap-2" 
                        type="button" data-bs-toggle="dropdown">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=3b82f6&color=fff&size=28" 
                         class="rounded-circle" width="28" height="28" alt="avatar">
                    <span class="d-none d-sm-inline">Admin</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="#"><i class="fas fa-user me-2"></i>Hồ sơ</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#"><i class="fas fa-sign-out-alt me-2"></i>Đăng xuất</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- PAGE CONTENT -->
    <main class="page-content">
