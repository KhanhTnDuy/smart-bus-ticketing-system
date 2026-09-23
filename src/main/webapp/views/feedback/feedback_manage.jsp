<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c"   uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%
    request.setAttribute("pageTitle", "Quản lý phản ánh");
    request.setAttribute("breadcrumb",
        "<nav aria-label='breadcrumb'><ol class='breadcrumb mb-0'>" +
        "<li class='breadcrumb-item'><a href='" + request.getContextPath() + "/'>Dashboard</a></li>" +
        "<li class='breadcrumb-item active'>Quản lý phản ánh</li></ol></nav>");
%>
<%@ include file="/views/layout/header.jsp" %>

<div class="container-fluid py-4">

    <!-- Page Header -->
    <div class="page-header mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
            <h1 class="page-title">
                <i class="fas fa-comments me-2 text-primary"></i>Quản lý phản ánh &amp; Đánh giá
            </h1>
            <p class="text-muted mb-0">Xem và xử lý khiếu nại, đánh giá từ hành khách</p>
        </div>
        <a href="${pageContext.request.contextPath}/feedback/submit" class="btn btn-primary btn-sm">
            <i class="fas fa-plus me-1"></i>Thêm phản ánh
        </a>
    </div>

    <!-- ── Summary Cards ──────────────────────────────────── -->
    <div class="row g-3 mb-4">
        <div class="col-md-4">
            <a href="?status=PENDING" class="text-decoration-none">
                <div class="summary-card summary-card--pending ${fStatus == 'PENDING' ? 'active' : ''}">
                    <div class="summary-icon"><i class="fas fa-clock"></i></div>
                    <div class="summary-body">
                        <div class="summary-value">${pendingCount}</div>
                        <div class="summary-label">Chưa xử lý</div>
                    </div>
                    <div class="summary-badge">
                        <span class="badge badge-pending">&bull; Cần xử lý</span>
                    </div>
                </div>
            </a>
        </div>
        <div class="col-md-4">
            <a href="?status=PROCESSING" class="text-decoration-none">
                <div class="summary-card summary-card--processing ${fStatus == 'PROCESSING' ? 'active' : ''}">
                    <div class="summary-icon"><i class="fas fa-spinner fa-spin"></i></div>
                    <div class="summary-body">
                        <div class="summary-value">${processingCount}</div>
                        <div class="summary-label">Đang xử lý</div>
                    </div>
                    <div class="summary-badge">
                        <span class="badge badge-processing">&bull; Đang xử lý</span>
                    </div>
                </div>
            </a>
        </div>
        <div class="col-md-4">
            <a href="?status=RESOLVED" class="text-decoration-none">
                <div class="summary-card summary-card--resolved ${fStatus == 'RESOLVED' ? 'active' : ''}">
                    <div class="summary-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="summary-body">
                        <div class="summary-value">${resolvedCount}</div>
                        <div class="summary-label">Đã xử lý</div>
                    </div>
                    <div class="summary-badge">
                        <span class="badge badge-resolved">&bull; Hoàn thành</span>
                    </div>
                </div>
            </a>
        </div>
    </div>

    <!-- ── Filter Panel ──────────────────────────────────── -->
    <div class="card card-custom mb-4">
        <div class="card-header-custom">
            <i class="fas fa-filter me-2 text-primary"></i>Bộ lọc
        </div>
        <div class="card-body p-4">
            <form method="get" action="${pageContext.request.contextPath}/admin/feedbacks">
                <div class="row g-3 align-items-end">
                    <div class="col-lg-2 col-md-6">
                        <label class="form-label fw-semibold">Loại</label>
                        <select class="form-select" name="type">
                            <option value="">-- Tất cả --</option>
                            <option value="COMPLAINT" <c:if test="${fType == 'COMPLAINT'}">selected</c:if>>Khiếu nại</option>
                            <option value="REVIEW"    <c:if test="${fType == 'REVIEW'}">selected</c:if>>Đánh giá</option>
                        </select>
                    </div>
                    <div class="col-lg-2 col-md-6">
                        <label class="form-label fw-semibold">Trạng thái</label>
                        <select class="form-select" name="status">
                            <option value="">-- Tất cả --</option>
                            <option value="PENDING"    <c:if test="${fStatus == 'PENDING'}">selected</c:if>>Chưa xử lý</option>
                            <option value="PROCESSING" <c:if test="${fStatus == 'PROCESSING'}">selected</c:if>>Đang xử lý</option>
                            <option value="RESOLVED"   <c:if test="${fStatus == 'RESOLVED'}">selected</c:if>>Đã xử lý</option>
                        </select>
                    </div>
                    <div class="col-lg-2 col-md-6">
                        <label class="form-label fw-semibold">Từ ngày</label>
                        <input type="date" class="form-control" name="fromDate" value="<c:out value='${fFromDate}'/>">
                    </div>
                    <div class="col-lg-2 col-md-6">
                        <label class="form-label fw-semibold">Đến ngày</label>
                        <input type="date" class="form-control" name="toDate" value="<c:out value='${fToDate}'/>">
                    </div>
                    <div class="col-lg-auto">
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-search me-1"></i>Lọc
                            </button>
                            <a href="${pageContext.request.contextPath}/admin/feedbacks" 
                               class="btn btn-outline-secondary">
                                <i class="fas fa-times me-1"></i>Xóa lọc
                            </a>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- ── Error ──────────────────────────────────────────── -->
    <c:if test="${not empty errorMsg}">
        <div class="alert alert-danger mb-4">
            <i class="fas fa-exclamation-triangle me-2"></i><c:out value="${errorMsg}"/>
        </div>
    </c:if>

    <!-- ── Table ────────────────────────────────────────────── -->
    <div class="card card-custom">
        <div class="card-header-custom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
                <i class="fas fa-table me-2 text-primary"></i>Danh sách phản ánh
                <span class="badge bg-primary ms-2">${total} phản ánh</span>
            </div>
            <small class="text-muted">Trang ${page} / ${totalPages > 0 ? totalPages : 1}</small>
        </div>
        <div class="table-responsive">
            <table class="table table-hover table-feedback mb-0">
                <thead>
                    <tr>
                        <th width="55">#</th>
                        <th width="180">Hành khách</th>
                        <th width="110">Loại</th>
                        <th>Nội dung</th>
                        <th width="120">Đánh giá</th>
                        <th width="130">Trạng thái</th>
                        <th width="130">Ngày gửi</th>
                        <th width="100" class="text-center">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    <c:choose>
                        <c:when test="${empty feedbacks}">
                            <tr>
                                <td colspan="8" class="text-center py-5">
                                    <div class="empty-state">
                                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                                        <div class="text-muted fw-medium">Không có phản ánh nào</div>
                                        <div class="text-muted small">Thử thay đổi bộ lọc để xem thêm</div>
                                    </div>
                                </td>
                            </tr>
                        </c:when>
                        <c:otherwise>
                            <c:forEach var="fb" items="${feedbacks}" varStatus="vs">
                                <tr class="feedback-row">
                                    <td class="text-muted small">${(page-1)*pageSize + vs.index + 1}</td>
                                    <td>
                                        <div class="d-flex align-items-center gap-2">
                                            <img src="https://ui-avatars.com/api/?name=${fb.passengerName}&size=32&background=dbeafe&color=1d4ed8"
                                                 class="rounded-circle flex-shrink-0" width="32" height="32" alt="">
                                            <div>
                                                <div class="fw-medium small"><c:out value="${fb.passengerName}"/></div>
                                                <div class="text-muted small"><c:out value="${fb.passengerEmail != null ? fb.passengerEmail : '—'}"/></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge ${fb.typeBadgeClass}">
                                            <i class="fas ${fb.typeIcon} me-1"></i>
                                            <c:out value="${fb.typeLabel}"/>
                                        </span>
                                        <c:if test="${not empty fb.tripRoute}">
                                            <div class="text-muted small mt-1">
                                                <i class="fas fa-route me-1"></i>
                                                <c:out value="${fb.tripRoute}"/>
                                            </div>
                                        </c:if>
                                    </td>
                                    <td>
                                        <c:if test="${not empty fb.subject}">
                                            <div class="fw-medium small mb-1"><c:out value="${fb.subject}"/></div>
                                        </c:if>
                                        <div class="text-muted small">
                                            <c:out value="${fb.contentSummary}"/>
                                        </div>
                                        <c:if test="${not empty fb.imagePath}">
                                            <span class="badge bg-secondary bg-opacity-25 text-secondary mt-1 small">
                                                <i class="fas fa-image me-1"></i>Có ảnh
                                            </span>
                                        </c:if>
                                    </td>
                                    <td>
                                        <c:choose>
                                            <c:when test="${fb.type == 'REVIEW' && fb.rating != null}">
                                                <div class="stars-display">
                                                    <c:forEach begin="1" end="5" var="i">
                                                        <i class="fas fa-star ${i <= fb.rating ? 'text-warning' : 'text-muted opacity-25'}"></i>
                                                    </c:forEach>
                                                </div>
                                                <div class="text-muted small">${fb.rating}/5 sao</div>
                                            </c:when>
                                            <c:otherwise>
                                                <span class="text-muted">—</span>
                                            </c:otherwise>
                                        </c:choose>
                                    </td>
                                    <td>
                                        <!-- Quick Status Update -->
                                        <div class="status-update-wrapper" data-id="${fb.id}">
                                            <span class="badge ${fb.statusBadgeClass} status-badge d-block mb-1 py-2"
                                                  id="status-badge-${fb.id}">
                                                <c:out value="${fb.statusLabel}"/>
                                            </span>
                                            <select class="form-select form-select-sm status-select"
                                                    data-id="${fb.id}"
                                                    onchange="quickUpdateStatus(${fb.id}, this.value, this)">
                                                <option value="PENDING"    <c:if test="${fb.status == 'PENDING'}">selected</c:if>>Chưa xử lý</option>
                                                <option value="PROCESSING" <c:if test="${fb.status == 'PROCESSING'}">selected</c:if>>Đang xử lý</option>
                                                <option value="RESOLVED"   <c:if test="${fb.status == 'RESOLVED'}">selected</c:if>>Đã xử lý</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="fw-medium small">
                                            <fmt:formatDate value="${fb.createdAt}" pattern="dd/MM/yyyy"/>
                                        </div>
                                        <div class="text-muted small">
                                            <fmt:formatDate value="${fb.createdAt}" pattern="HH:mm"/>
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        <a href="${pageContext.request.contextPath}/admin/feedback-detail?id=${fb.id}"
                                           class="btn btn-sm btn-outline-primary" title="Xem chi tiết">
                                            <i class="fas fa-eye"></i>
                                        </a>
                                    </td>
                                </tr>
                            </c:forEach>
                        </c:otherwise>
                    </c:choose>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="card-footer-custom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="text-muted small">
                Hiển thị <strong>${(page-1)*pageSize + 1}–${(page-1)*pageSize + feedbacks.size()}</strong>
                / tổng <strong>${total}</strong>
            </div>
            <c:if test="${totalPages > 1}">
                <nav>
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item ${page <= 1 ? 'disabled' : ''}">
                            <a class="page-link" href="?page=${page-1}&type=${fType}&status=${fStatus}&fromDate=${fFromDate}&toDate=${fToDate}">
                                <i class="fas fa-chevron-left"></i>
                            </a>
                        </li>
                        <c:forEach begin="1" end="${totalPages}" var="i">
                            <c:if test="${i >= page-2 && i <= page+2}">
                                <li class="page-item ${i == page ? 'active' : ''}">
                                    <a class="page-link" href="?page=${i}&type=${fType}&status=${fStatus}&fromDate=${fFromDate}&toDate=${fToDate}">
                                        ${i}
                                    </a>
                                </li>
                            </c:if>
                        </c:forEach>
                        <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="?page=${page+1}&type=${fType}&status=${fStatus}&fromDate=${fFromDate}&toDate=${fToDate}">
                                <i class="fas fa-chevron-right"></i>
                            </a>
                        </li>
                    </ul>
                </nav>
            </c:if>
        </div>
    </div>
</div>

<script>
const ctx = '${pageContext.request.contextPath}';

function quickUpdateStatus(feedbackId, newStatus, selectEl) {
    const statusLabels = { PENDING:'Chưa xử lý', PROCESSING:'Đang xử lý', RESOLVED:'Đã xử lý' };
    const statusClasses = { 
        PENDING:'badge-pending', 
        PROCESSING:'badge-processing', 
        RESOLVED:'badge-resolved' 
    };

    Swal.fire({
        title: 'Cập nhật trạng thái?',
        text: `Chuyển sang: "${statusLabels[newStatus]}"`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Huỷ',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280'
    }).then(result => {
        if (!result.isConfirmed) {
            // Revert select
            selectEl.value = selectEl.getAttribute('data-current');
            return;
        }

        fetch(ctx + '/admin/feedback-status', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `feedbackId=${feedbackId}&newStatus=${newStatus}`
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const badge = document.getElementById('status-badge-' + feedbackId);
                // Remove all badge classes
                badge.className = 'badge status-badge d-block mb-1 py-2 ' + statusClasses[newStatus];
                badge.textContent = statusLabels[newStatus];
                selectEl.setAttribute('data-current', newStatus);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: data.message,
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            } else {
                selectEl.value = selectEl.getAttribute('data-current');
                Swal.fire({ icon:'error', title:'Lỗi', text: data.message, confirmButtonColor:'#ef4444' });
            }
        })
        .catch(() => {
            selectEl.value = selectEl.getAttribute('data-current');
            Swal.fire({ icon:'error', title:'Lỗi', text:'Không thể kết nối server!', confirmButtonColor:'#ef4444' });
        });
    });
}

// Init current value tracking
document.querySelectorAll('.status-select').forEach(sel => {
    sel.setAttribute('data-current', sel.value);
});
</script>

<%@ include file="/views/layout/footer.jsp" %>
