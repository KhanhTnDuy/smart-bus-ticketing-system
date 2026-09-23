<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c"   uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%
    Object fbObj = request.getAttribute("feedback");
    String fbId  = fbObj != null ? String.valueOf(((com.smartbus.model.Feedback)fbObj).getId()) : "—";
    request.setAttribute("pageTitle", "Chi tiết phản ánh #" + fbId);
    request.setAttribute("breadcrumb",
        "<nav aria-label='breadcrumb'><ol class='breadcrumb mb-0'>" +
        "<li class='breadcrumb-item'><a href='" + request.getContextPath() + "/'>Dashboard</a></li>" +
        "<li class='breadcrumb-item'><a href='" + request.getContextPath() + "/admin/feedbacks'>Quản lý phản ánh</a></li>" +
        "<li class='breadcrumb-item active'>Chi tiết #" + fbId + "</li>" +
        "</ol></nav>");
%>
<%@ include file="/views/layout/header.jsp" %>

<div class="container-fluid py-4">
    <div class="row">
        <div class="col-xl-8">

            <!-- Error -->
            <c:if test="${not empty errorMsg}">
                <div class="alert alert-danger mb-4"><i class="fas fa-exclamation-triangle me-2"></i>${errorMsg}</div>
            </c:if>

            <c:if test="${not empty feedback}">

            <!-- ── Feedback Info Card ─────────────────────── -->
            <div class="card card-custom mb-4">
                <div class="card-header-custom d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div class="d-flex align-items-center gap-3">
                        <span class="badge ${feedback.typeBadgeClass} fs-6 px-3 py-2">
                            <i class="fas ${feedback.typeIcon} me-2"></i>
                            <c:out value="${feedback.typeLabel}"/>
                        </span>
                        <span class="text-muted">Phản ánh #${feedback.id}</span>
                    </div>
                    <span class="badge ${feedback.statusBadgeClass} fs-6 px-3 py-2" id="currentStatusBadge">
                        <c:out value="${feedback.statusLabel}"/>
                    </span>
                </div>
                <div class="card-body p-4">

                    <!-- Subject -->
                    <c:if test="${not empty feedback.subject}">
                        <h4 class="fw-bold mb-3"><c:out value="${feedback.subject}"/></h4>
                    </c:if>

                    <!-- Passenger & Trip Info -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <div class="info-block">
                                <div class="info-label"><i class="fas fa-user me-1"></i>Hành khách</div>
                                <div class="info-value fw-medium"><c:out value="${feedback.passengerName}"/></div>
                                <c:if test="${not empty feedback.passengerEmail}">
                                    <div class="info-sub"><i class="fas fa-envelope me-1 text-muted"></i><c:out value="${feedback.passengerEmail}"/></div>
                                </c:if>
                                <c:if test="${not empty feedback.passengerPhone}">
                                    <div class="info-sub"><i class="fas fa-phone me-1 text-muted"></i><c:out value="${feedback.passengerPhone}"/></div>
                                </c:if>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-block">
                                <div class="info-label"><i class="fas fa-bus me-1"></i>Thông tin chuyến đi</div>
                                <c:if test="${not empty feedback.tripId}">
                                    <div class="info-value font-monospace"><c:out value="${feedback.tripId}"/></div>
                                </c:if>
                                <c:if test="${not empty feedback.tripRoute}">
                                    <div class="info-sub"><i class="fas fa-route me-1 text-muted"></i><c:out value="${feedback.tripRoute}"/></div>
                                </c:if>
                                <c:if test="${empty feedback.tripId && empty feedback.tripRoute}">
                                    <div class="info-value text-muted">—</div>
                                </c:if>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="info-block">
                                <div class="info-label"><i class="far fa-clock me-1"></i>Ngày gửi</div>
                                <div class="info-value">
                                    <fmt:formatDate value="${feedback.createdAt}" pattern="dd/MM/yyyy HH:mm:ss"/>
                                </div>
                            </div>
                        </div>
                        <c:if test="${feedback.type == 'REVIEW' && feedback.rating != null}">
                        <div class="col-md-6">
                            <div class="info-block">
                                <div class="info-label"><i class="fas fa-star me-1"></i>Đánh giá</div>
                                <div class="info-value">
                                    <c:forEach begin="1" end="5" var="i">
                                        <i class="fas fa-star ${i <= feedback.rating ? 'text-warning' : 'text-muted opacity-25'} fa-lg"></i>
                                    </c:forEach>
                                    <span class="ms-2 fw-semibold">${feedback.rating}/5 sao</span>
                                </div>
                            </div>
                        </div>
                        </c:if>
                    </div>

                    <!-- Content -->
                    <div class="mb-4">
                        <label class="form-label fw-semibold text-muted small text-uppercase">Nội dung phản ánh</label>
                        <div class="content-box">
                            <c:out value="${feedback.content}"/>
                        </div>
                    </div>

                    <!-- Attached Image -->
                    <c:if test="${not empty feedback.imagePath}">
                        <div class="mb-4">
                            <label class="form-label fw-semibold text-muted small text-uppercase">Ảnh đính kèm</label>
                            <div>
                                <a href="${pageContext.request.contextPath}/uploads/${feedback.imagePath}" 
                                   target="_blank">
                                    <img src="${pageContext.request.contextPath}/uploads/${feedback.imagePath}" 
                                         class="attachment-img" alt="Ảnh đính kèm">
                                </a>
                            </div>
                        </div>
                    </c:if>

                    <!-- Admin Response -->
                    <c:if test="${not empty feedback.adminResponse}">
                        <div class="admin-response-box">
                            <div class="admin-response-header">
                                <i class="fas fa-headset me-2"></i>Phản hồi từ Admin
                                <c:if test="${not empty feedback.processedBy}">
                                    <span class="text-muted ms-2">— <c:out value="${feedback.processedBy}"/></span>
                                </c:if>
                            </div>
                            <div class="admin-response-content">
                                <c:out value="${feedback.adminResponse}"/>
                            </div>
                        </div>
                    </c:if>
                </div>
            </div>

            <!-- ── Back button ──────────────────────────────── -->
            <a href="${pageContext.request.contextPath}/admin/feedbacks" class="btn btn-outline-secondary">
                <i class="fas fa-arrow-left me-2"></i>Quay lại danh sách
            </a>

            </c:if><%-- end c:if feedback not empty --%>
        </div>

        <!-- ── Sidebar: Status Update + Timeline ──────────── -->
        <c:if test="${not empty feedback}">
        <div class="col-xl-4">

            <!-- Status Update Card -->
            <div class="card card-custom mb-4 sticky-top" style="top: 80px;">
                <div class="card-header-custom">
                    <i class="fas fa-edit me-2 text-primary"></i>Cập nhật trạng thái
                </div>
                <div class="card-body p-4">
                    <form id="statusUpdateForm">
                        <input type="hidden" id="feedbackIdInput" value="${feedback.id}">

                        <div class="mb-3">
                            <label class="form-label fw-semibold">Trạng thái mới</label>
                            <div class="status-btn-group">
                                <button type="button" class="status-btn ${feedback.status == 'PENDING' ? 'status-btn--pending active' : 'status-btn--pending'}"
                                        onclick="selectStatus('PENDING', this)">
                                    <i class="fas fa-clock me-2"></i>Chưa xử lý
                                </button>
                                <button type="button" class="status-btn ${feedback.status == 'PROCESSING' ? 'status-btn--processing active' : 'status-btn--processing'}"
                                        onclick="selectStatus('PROCESSING', this)">
                                    <i class="fas fa-spinner me-2"></i>Đang xử lý
                                </button>
                                <button type="button" class="status-btn ${feedback.status == 'RESOLVED' ? 'status-btn--resolved active' : 'status-btn--resolved'}"
                                        onclick="selectStatus('RESOLVED', this)">
                                    <i class="fas fa-check-circle me-2"></i>Đã xử lý
                                </button>
                            </div>
                            <input type="hidden" id="selectedStatus" value="${feedback.status}">
                        </div>

                        <div class="mb-3">
                            <label for="adminResponse" class="form-label fw-semibold">Phản hồi admin</label>
                            <textarea class="form-control" id="adminResponse" rows="4"
                                      placeholder="Nhập nội dung phản hồi gửi đến hành khách..."><c:out value="${feedback.adminResponse}"/></textarea>
                        </div>

                        <button type="button" class="btn btn-primary w-100" onclick="submitStatusUpdate()">
                            <i class="fas fa-save me-2"></i>Lưu thay đổi
                            <span class="spinner-border spinner-border-sm ms-2 d-none" id="updateSpinner"></span>
                        </button>
                    </form>
                </div>
            </div>

            <!-- Timeline Card -->
            <div class="card card-custom">
                <div class="card-header-custom">
                    <i class="fas fa-stream me-2 text-primary"></i>Lịch sử xử lý
                </div>
                <div class="card-body p-4">
                    <c:choose>
                        <c:when test="${empty history}">
                            <div class="text-center text-muted py-3">
                                <i class="fas fa-clock fa-2x mb-2 opacity-25"></i>
                                <div class="small">Chưa có lịch sử cập nhật</div>
                            </div>
                        </c:when>
                        <c:otherwise>
                            <div class="timeline" id="historyTimeline">
                                <!-- Initial state -->
                                <div class="timeline-item">
                                    <div class="timeline-dot timeline-dot--pending"></div>
                                    <div class="timeline-content">
                                        <div class="timeline-title">Phản ánh được gửi</div>
                                        <div class="timeline-meta text-muted small">
                                            <fmt:formatDate value="${feedback.createdAt}" pattern="dd/MM/yyyy HH:mm"/>
                                        </div>
                                    </div>
                                </div>

                                <c:forEach var="h" items="${history}">
                                    <div class="timeline-item">
                                        <div class="timeline-dot timeline-dot--${h.newStatus.toLowerCase()}"></div>
                                        <div class="timeline-content">
                                            <div class="timeline-title">
                                                Chuyển: 
                                                <span class="badge ${h.newStatusBadgeClass} small">
                                                    <c:out value="${h.newStatusLabel}"/>
                                                </span>
                                            </div>
                                            <div class="timeline-meta text-muted small">
                                                <i class="fas fa-user me-1"></i><c:out value="${h.changedBy}"/> &bull;
                                                <fmt:formatDate value="${h.changedAt}" pattern="dd/MM/yyyy HH:mm"/>
                                            </div>
                                            <c:if test="${not empty h.note}">
                                                <div class="timeline-note small mt-1 text-muted">
                                                    <c:out value="${h.note}"/>
                                                </div>
                                            </c:if>
                                        </div>
                                    </div>
                                </c:forEach>
                            </div>
                        </c:otherwise>
                    </c:choose>
                </div>
            </div>
        </div>
        </c:if>

    </div>
</div>

<script>
const ctx = '${pageContext.request.contextPath}';
let selectedStatus = '${feedback.status}';

function selectStatus(status, btn) {
    selectedStatus = status;
    document.getElementById('selectedStatus').value = status;
    document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function submitStatusUpdate() {
    const feedbackId    = document.getElementById('feedbackIdInput').value;
    const adminResponse = document.getElementById('adminResponse').value;
    const spinner       = document.getElementById('updateSpinner');

    spinner.classList.remove('d-none');

    fetch(ctx + '/admin/feedback-status', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `feedbackId=${feedbackId}&newStatus=${selectedStatus}&adminResponse=${encodeURIComponent(adminResponse)}`
    })
    .then(r => r.json())
    .then(data => {
        spinner.classList.add('d-none');
        if (data.success) {
            // Update badge
            const badge = document.getElementById('currentStatusBadge');
            const classMap = {
                PENDING: 'badge-pending', 
                PROCESSING: 'badge-processing', 
                RESOLVED: 'badge-resolved'
            };
            badge.className = 'badge fs-6 px-3 py-2 ' + classMap[selectedStatus];
            badge.textContent = data.newStatusLabel;

            Swal.fire({
                icon: 'success', title: 'Thành công!',
                text: data.message, timer: 2000,
                showConfirmButton: false, toast: true, position: 'top-end'
            });

            // Reload sau 2 giây để cập nhật timeline
            setTimeout(() => location.reload(), 2000);
        } else {
            Swal.fire({ icon:'error', title:'Lỗi', text: data.message, confirmButtonColor:'#ef4444' });
        }
    })
    .catch(() => {
        spinner.classList.add('d-none');
        Swal.fire({ icon:'error', title:'Lỗi kết nối', text:'Không thể kết nối đến server!', confirmButtonColor:'#ef4444' });
    });
}
</script>

<%@ include file="/views/layout/footer.jsp" %>
