<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c"   uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%
    request.setAttribute("pageTitle", "Nhật ký hệ thống");
    request.setAttribute("breadcrumb",
        "<nav aria-label='breadcrumb'><ol class='breadcrumb mb-0'>" +
        "<li class='breadcrumb-item'><a href='" + request.getContextPath() + "/'>Dashboard</a></li>" +
        "<li class='breadcrumb-item active'>Nhật ký hệ thống</li></ol></nav>");
%>
<%@ include file="/views/layout/header.jsp" %>

<div class="container-fluid py-4">

    <!-- Page Header -->
    <div class="page-header mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
            <h1 class="page-title">
                <i class="fas fa-history me-2 text-primary"></i>Nhật ký hệ thống
            </h1>
            <p class="text-muted mb-0">Xem và lọc lịch sử thao tác của tất cả người dùng trong hệ thống</p>
        </div>
        <button class="btn btn-outline-success btn-sm" onclick="exportCSV()">
            <i class="fas fa-file-csv me-1"></i>Xuất CSV
        </button>
    </div>

    <!-- ── Filter Panel ──────────────────────────────────── -->
    <div class="card card-custom mb-4">
        <div class="card-header-custom d-flex align-items-center justify-content-between">
            <span><i class="fas fa-filter me-2 text-primary"></i>Bộ lọc nâng cao</span>
            <button class="btn btn-link btn-sm text-decoration-none p-0" 
                    type="button" data-bs-toggle="collapse" data-bs-target="#filterPanel">
                <i class="fas fa-chevron-down"></i>
            </button>
        </div>
        <div class="collapse show" id="filterPanel">
            <div class="card-body p-4">
                <form method="get" action="${pageContext.request.contextPath}/admin/audit-log" id="filterForm">
                    <div class="row g-3 align-items-end">

                        <div class="col-lg-3 col-md-6">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-user me-1 text-muted"></i>Người dùng
                            </label>
                            <input type="text" class="form-control" name="username"
                                   placeholder="Tìm theo tên đăng nhập..."
                                   value="<c:out value='${fUsername}'/>">
                        </div>

                        <div class="col-lg-2 col-md-6">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-tag me-1 text-muted"></i>Loại thao tác
                            </label>
                            <select class="form-select" name="actionType">
                                <option value="">-- Tất cả --</option>
                                <option value="LOGIN"           <c:if test="${fActionType == 'LOGIN'}">selected</c:if>>Đăng nhập</option>
                                <option value="LOGOUT"          <c:if test="${fActionType == 'LOGOUT'}">selected</c:if>>Đăng xuất</option>
                                <option value="CREATE"          <c:if test="${fActionType == 'CREATE'}">selected</c:if>>Tạo mới</option>
                                <option value="UPDATE"          <c:if test="${fActionType == 'UPDATE'}">selected</c:if>>Cập nhật</option>
                                <option value="DELETE"          <c:if test="${fActionType == 'DELETE'}">selected</c:if>>Xóa</option>
                                <option value="VIEW"            <c:if test="${fActionType == 'VIEW'}">selected</c:if>>Xem</option>
                                <option value="EXPORT"          <c:if test="${fActionType == 'EXPORT'}">selected</c:if>>Xuất dữ liệu</option>
                                <option value="PAYMENT"         <c:if test="${fActionType == 'PAYMENT'}">selected</c:if>>Thanh toán</option>
                                <option value="TICKET_BUY"      <c:if test="${fActionType == 'TICKET_BUY'}">selected</c:if>>Mua vé</option>
                                <option value="FEEDBACK_SUBMIT" <c:if test="${fActionType == 'FEEDBACK_SUBMIT'}">selected</c:if>>Gửi phản ánh</option>
                                <option value="STATUS_CHANGE"   <c:if test="${fActionType == 'STATUS_CHANGE'}">selected</c:if>>Đổi trạng thái</option>
                            </select>
                        </div>

                        <div class="col-lg-2 col-md-6">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-circle-check me-1 text-muted"></i>Kết quả
                            </label>
                            <select class="form-select" name="status">
                                <option value="">-- Tất cả --</option>
                                <option value="SUCCESS" <c:if test="${fStatus == 'SUCCESS'}">selected</c:if>>Thành công</option>
                                <option value="FAILURE" <c:if test="${fStatus == 'FAILURE'}">selected</c:if>>Thất bại</option>
                                <option value="WARNING" <c:if test="${fStatus == 'WARNING'}">selected</c:if>>Cảnh báo</option>
                            </select>
                        </div>

                        <div class="col-lg-2 col-md-6">
                            <label class="form-label fw-semibold">
                                <i class="far fa-calendar me-1 text-muted"></i>Từ ngày
                            </label>
                            <input type="date" class="form-control" name="fromDate"
                                   value="<c:out value='${fFromDate}'/>">
                        </div>

                        <div class="col-lg-2 col-md-6">
                            <label class="form-label fw-semibold">
                                <i class="far fa-calendar-check me-1 text-muted"></i>Đến ngày
                            </label>
                            <input type="date" class="form-control" name="toDate"
                                   value="<c:out value='${fToDate}'/>">
                        </div>

                        <div class="col-lg-1 col-md-6">
                            <div class="d-flex flex-column gap-2">
                                <button type="submit" class="btn btn-primary btn-sm">
                                    <i class="fas fa-search me-1"></i>Lọc
                                </button>
                                <a href="${pageContext.request.contextPath}/admin/audit-log" 
                                   class="btn btn-outline-secondary btn-sm">
                                    <i class="fas fa-times me-1"></i>Xóa
                                </a>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- ── Error Message ────────────────────────────────────── -->
    <c:if test="${not empty errorMsg}">
        <div class="alert alert-danger d-flex align-items-center gap-2 mb-4">
            <i class="fas fa-exclamation-triangle"></i>
            <c:out value="${errorMsg}"/>
        </div>
    </c:if>

    <!-- ── Table ────────────────────────────────────────────── -->
    <div class="card card-custom">
        <div class="card-header-custom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
                <i class="fas fa-table me-2 text-primary"></i>
                Nhật ký thao tác
                <span class="badge bg-primary ms-2"><c:out value="${total}" default="0"/> bản ghi</span>
            </div>
            <div class="text-muted small">
                Trang <c:out value="${page}"/> / <c:out value="${totalPages > 0 ? totalPages : 1}"/>
            </div>
        </div>

        <div class="table-responsive">
            <table class="table table-hover table-audit mb-0" id="auditTable">
                <thead>
                    <tr>
                        <th width="60">#</th>
                        <th width="155">Thời gian</th>
                        <th width="140">Người dùng</th>
                        <th>Hành động</th>
                        <th width="145">Loại thao tác</th>
                        <th width="160">Tài nguyên</th>
                        <th width="120">IP Address</th>
                        <th width="105">Kết quả</th>
                    </tr>
                </thead>
                <tbody>
                    <c:choose>
                        <c:when test="${empty logs}">
                            <tr>
                                <td colspan="8" class="text-center py-5">
                                    <div class="empty-state">
                                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                                        <div class="text-muted">Không tìm thấy nhật ký nào phù hợp</div>
                                    </div>
                                </td>
                            </tr>
                        </c:when>
                        <c:otherwise>
                            <c:forEach var="log" items="${logs}" varStatus="vs">
                                <tr class="log-row" data-id="${log.id}"
                                    onclick="showLogDetail(${log.id}, '${log.action}', '${log.details}', '${log.userAgent}')">
                                    <td class="text-muted small">${(page-1)*pageSize + vs.index + 1}</td>
                                    <td>
                                        <div class="fw-semibold small">
                                            <fmt:formatDate value="${log.createdAt}" pattern="dd/MM/yyyy" type="date"/>
                                        </div>
                                        <div class="text-muted small">
                                            <fmt:formatDate value="${log.createdAt}" pattern="HH:mm:ss" type="time"/>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="d-flex align-items-center gap-2">
                                            <img src="https://ui-avatars.com/api/?name=${log.username}&size=28&background=e0e7ff&color=4f46e5"
                                                 class="rounded-circle" width="28" height="28" alt="">
                                            <span class="fw-medium small"><c:out value="${log.username}"/></span>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="action-text" title="${log.action}">
                                            <c:out value="${log.action}"/>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge ${log.actionTypeBadgeClass} badge-action">
                                            <c:out value="${log.actionTypeLabel}"/>
                                        </span>
                                    </td>
                                    <td class="text-muted small font-monospace">
                                        <c:out value="${log.targetResource != null ? log.targetResource : '—'}"/>
                                    </td>
                                    <td class="small font-monospace text-muted">
                                        <c:out value="${log.ipAddress != null ? log.ipAddress : '—'}"/>
                                    </td>
                                    <td>
                                        <span class="badge ${log.statusBadgeClass}">
                                            <c:out value="${log.statusLabel}"/>
                                        </span>
                                    </td>
                                </tr>
                            </c:forEach>
                        </c:otherwise>
                    </c:choose>
                </tbody>
            </table>
        </div>

        <!-- ── Pagination ──────────────────────────────────── -->
        <div class="card-footer-custom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="text-muted small">
                Hiển thị
                <strong>${(page-1)*pageSize + 1}–${(page-1)*pageSize + logs.size()}</strong>
                trong tổng số <strong>${total}</strong> bản ghi
            </div>
            <c:if test="${totalPages > 1}">
                <nav>
                    <ul class="pagination pagination-sm mb-0">
                        <%-- Prev --%>
                        <li class="page-item ${page <= 1 ? 'disabled' : ''}">
                            <a class="page-link" href="?page=${page-1}&username=${fUsername}&actionType=${fActionType}&status=${fStatus}&fromDate=${fFromDate}&toDate=${fToDate}">
                                <i class="fas fa-chevron-left"></i>
                            </a>
                        </li>
                        <%-- Page numbers --%>
                        <c:forEach begin="1" end="${totalPages}" var="i">
                            <c:if test="${i >= page-2 && i <= page+2}">
                                <li class="page-item ${i == page ? 'active' : ''}">
                                    <a class="page-link" href="?page=${i}&username=${fUsername}&actionType=${fActionType}&status=${fStatus}&fromDate=${fFromDate}&toDate=${fToDate}">
                                        <c:out value="${i}"/>
                                    </a>
                                </li>
                            </c:if>
                        </c:forEach>
                        <%-- Next --%>
                        <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="?page=${page+1}&username=${fUsername}&actionType=${fActionType}&status=${fStatus}&fromDate=${fFromDate}&toDate=${fToDate}">
                                <i class="fas fa-chevron-right"></i>
                            </a>
                        </li>
                    </ul>
                </nav>
            </c:if>
        </div>
    </div>
</div>

<!-- ── Detail Modal ──────────────────────────────────────── -->
<div class="modal fade" id="logDetailModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title">
                    <i class="fas fa-info-circle text-primary me-2"></i>Chi tiết nhật ký
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="logDetailContent"></div>
            <div class="modal-footer border-0">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Đóng</button>
            </div>
        </div>
    </div>
</div>

<script>
function showLogDetail(id, action, details, userAgent) {
    const content = document.getElementById('logDetailContent');
    content.innerHTML = `
        <div class="mb-3">
            <label class="form-label text-muted fw-semibold small">ID</label>
            <div class="font-monospace">#${id}</div>
        </div>
        <div class="mb-3">
            <label class="form-label text-muted fw-semibold small">HÀNH ĐỘNG</label>
            <div>${action}</div>
        </div>
        ${details ? `<div class="mb-3">
            <label class="form-label text-muted fw-semibold small">CHI TIẾT</label>
            <div class="bg-light rounded p-2 font-monospace small">${details}</div>
        </div>` : ''}
        ${userAgent ? `<div class="mb-0">
            <label class="form-label text-muted fw-semibold small">USER AGENT</label>
            <div class="text-muted small">${userAgent}</div>
        </div>` : ''}
    `;
    new bootstrap.Modal(document.getElementById('logDetailModal')).show();
}

function exportCSV() {
    Swal.fire({
        icon: 'info',
        title: 'Xuất CSV',
        text: 'Chức năng xuất CSV sẽ tải về file với bộ lọc hiện tại.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3b82f6'
    });
}
</script>

<%@ include file="/views/layout/footer.jsp" %>
