<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%
    request.setAttribute("pageTitle", "Gửi phản ánh & Đánh giá");
    request.setAttribute("breadcrumb",
        "<nav aria-label='breadcrumb'><ol class='breadcrumb mb-0'>" +
        "<li class='breadcrumb-item'><a href='" + request.getContextPath() + "/'>Dashboard</a></li>" +
        "<li class='breadcrumb-item active'>Gửi phản ánh</li></ol></nav>");
%>
<%@ include file="/views/layout/header.jsp" %>

<div class="container-fluid py-4">
    <div class="row justify-content-center">
        <div class="col-xl-8 col-lg-10">

            <!-- Page Header -->
            <div class="page-header mb-4">
                <h1 class="page-title">
                    <i class="fas fa-paper-plane me-2 text-primary"></i>Gửi phản ánh &amp; Đánh giá
                </h1>
                <p class="text-muted mb-0">Chia sẻ trải nghiệm của bạn để chúng tôi phục vụ tốt hơn</p>
            </div>

            <!-- ── Alert Messages ─────────────────────────── -->
            <c:if test="${not empty successMsg}">
                <div class="alert alert-success d-flex align-items-center gap-3 mb-4 alert-success-custom">
                    <i class="fas fa-check-circle fa-2x"></i>
                    <div>
                        <div class="fw-semibold">Gửi thành công!</div>
                        <div><c:out value="${successMsg}"/></div>
                    </div>
                </div>
            </c:if>
            <c:if test="${not empty errorMsg}">
                <div class="alert alert-danger d-flex align-items-center gap-2 mb-4">
                    <i class="fas fa-exclamation-triangle"></i>
                    <c:out value="${errorMsg}"/>
                </div>
            </c:if>

            <!-- ── Type Selector ──────────────────────────── -->
            <div class="card card-custom mb-4">
                <div class="card-body p-4">
                    <label class="form-label fw-semibold mb-3">Bạn muốn gửi gì?</label>
                    <div class="type-selector row g-3">
                        <div class="col-6">
                            <input type="radio" class="btn-check" name="typeSelector" id="typeComplaint" 
                                   value="COMPLAINT" checked autocomplete="off">
                            <label class="type-selector-btn" for="typeComplaint">
                                <i class="fas fa-exclamation-circle fa-2x mb-2 text-danger"></i>
                                <div class="fw-semibold">Gửi khiếu nại</div>
                                <div class="small text-muted">Phản ánh vấn đề trong chuyến đi</div>
                            </label>
                        </div>
                        <div class="col-6">
                            <input type="radio" class="btn-check" name="typeSelector" id="typeReview" 
                                   value="REVIEW" autocomplete="off">
                            <label class="type-selector-btn" for="typeReview">
                                <i class="fas fa-star fa-2x mb-2 text-warning"></i>
                                <div class="fw-semibold">Đánh giá chuyến đi</div>
                                <div class="small text-muted">Chia sẻ trải nghiệm &amp; đánh giá sao</div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Main Form ──────────────────────────────── -->
            <form action="${pageContext.request.contextPath}/feedback/submit" 
                  method="post" enctype="multipart/form-data" id="feedbackForm" novalidate>

                <input type="hidden" name="type" id="hiddenType" value="COMPLAINT">

                <!-- Thông tin cá nhân -->
                <div class="card card-custom mb-4">
                    <div class="card-header-custom">
                        <i class="fas fa-user me-2 text-primary"></i>Thông tin hành khách
                    </div>
                    <div class="card-body p-4">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="passengerName" class="form-label fw-semibold">
                                    Họ và tên <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control" id="passengerName" 
                                       name="passengerName" placeholder="Nguyễn Văn A"
                                       value="<c:out value='${formData.passengerName}'/>" required>
                                <div class="invalid-feedback">Vui lòng nhập họ và tên.</div>
                            </div>
                            <div class="col-md-6">
                                <label for="passengerPhone" class="form-label fw-semibold">Số điện thoại</label>
                                <input type="tel" class="form-control" id="passengerPhone"
                                       name="passengerPhone" placeholder="0901234567"
                                       value="<c:out value='${formData.passengerPhone}'/>">
                            </div>
                            <div class="col-12">
                                <label for="passengerEmail" class="form-label fw-semibold">Email</label>
                                <input type="email" class="form-control" id="passengerEmail"
                                       name="passengerEmail" placeholder="email@example.com"
                                       value="<c:out value='${formData.passengerEmail}'/>">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Thông tin chuyến đi -->
                <div class="card card-custom mb-4">
                    <div class="card-header-custom">
                        <i class="fas fa-bus me-2 text-primary"></i>Thông tin chuyến đi
                    </div>
                    <div class="card-body p-4">
                        <div class="row g-3">
                            <div class="col-md-5">
                                <label for="tripId" class="form-label fw-semibold">Mã chuyến xe</label>
                                <input type="text" class="form-control font-monospace" id="tripId"
                                       name="tripId" placeholder="TRIP-2024-001"
                                       value="<c:out value='${formData.tripId}'/>">
                            </div>
                            <div class="col-md-7">
                                <label for="tripRoute" class="form-label fw-semibold">Tuyến đường</label>
                                <select class="form-select" id="tripRoute" name="tripRoute">
                                    <option value="">-- Chọn tuyến --</option>
                                    <option value="Hà Nội → Hải Phòng">Hà Nội → Hải Phòng</option>
                                    <option value="Hà Nội → Đà Nẵng">Hà Nội → Đà Nẵng</option>
                                    <option value="Hà Nội → Nam Định">Hà Nội → Nam Định</option>
                                    <option value="Hà Nội → Quảng Ninh">Hà Nội → Quảng Ninh</option>
                                    <option value="Hải Phòng → Hà Nội">Hải Phòng → Hà Nội</option>
                                    <option value="Đà Nẵng → Hồ Chí Minh">Đà Nẵng → Hồ Chí Minh</option>
                                    <option value="Hồ Chí Minh → Vũng Tàu">Hồ Chí Minh → Vũng Tàu</option>
                                    <option value="Hồ Chí Minh → Đà Lạt">Hồ Chí Minh → Đà Lạt</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Nội dung phản ánh -->
                <div class="card card-custom mb-4" id="complaintSection">
                    <div class="card-header-custom">
                        <i class="fas fa-exclamation-circle me-2 text-danger"></i>Nội dung khiếu nại
                    </div>
                    <div class="card-body p-4">
                        <div class="mb-3">
                            <label for="subject" class="form-label fw-semibold">
                                Tiêu đề <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control" id="subject" name="subject"
                                   placeholder="Tóm tắt vấn đề bạn gặp phải..."
                                   value="<c:out value='${formData.subject}'/>">
                        </div>
                        <div class="mb-3">
                            <label for="content" class="form-label fw-semibold">
                                Mô tả chi tiết <span class="text-danger">*</span>
                            </label>
                            <textarea class="form-control" id="content" name="content" 
                                      rows="5" maxlength="2000"
                                      placeholder="Mô tả chi tiết vấn đề bạn gặp phải, bao gồm thời gian, địa điểm và những gì đã xảy ra..."
                                      required><c:out value='${formData.content}'/></textarea>
                            <div class="d-flex justify-content-between mt-1">
                                <div class="invalid-feedback">Vui lòng nhập nội dung phản ánh.</div>
                                <small class="text-muted" id="charCount">0 / 2000 ký tự</small>
                            </div>
                        </div>
                        <!-- Image Upload -->
                        <div class="mb-0">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-image me-1 text-muted"></i>Ảnh đính kèm (tuỳ chọn)
                            </label>
                            <div class="upload-zone" id="uploadZone">
                                <input type="file" class="upload-input" id="imageFile" 
                                       name="image" accept="image/*">
                                <div class="upload-placeholder" id="uploadPlaceholder">
                                    <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-2"></i>
                                    <div class="fw-medium">Kéo thả ảnh vào đây hoặc <span class="text-primary">chọn file</span></div>
                                    <div class="small text-muted mt-1">JPEG, PNG, GIF, WEBP — tối đa 5MB</div>
                                </div>
                                <div class="upload-preview d-none" id="uploadPreview">
                                    <img id="previewImg" src="" alt="Preview" class="preview-img">
                                    <button type="button" class="btn-remove-img" onclick="removeImage()">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Star Rating (hiện khi REVIEW) -->
                <div class="card card-custom mb-4 d-none" id="reviewSection">
                    <div class="card-header-custom">
                        <i class="fas fa-star me-2 text-warning"></i>Đánh giá chuyến đi
                    </div>
                    <div class="card-body p-4">

                        <!-- Star Rating Component -->
                        <div class="mb-4 text-center">
                            <label class="form-label fw-semibold d-block mb-3">
                                Bạn đánh giá chuyến đi như thế nào?
                            </label>
                            <div class="star-rating-wrapper">
                                <div class="star-rating" id="starRating">
                                    <input type="radio" name="rating" id="star5" value="5">
                                    <label for="star5" title="Xuất sắc (5 sao)">
                                        <i class="fas fa-star"></i>
                                    </label>
                                    <input type="radio" name="rating" id="star4" value="4">
                                    <label for="star4" title="Tốt (4 sao)">
                                        <i class="fas fa-star"></i>
                                    </label>
                                    <input type="radio" name="rating" id="star3" value="3">
                                    <label for="star3" title="Bình thường (3 sao)">
                                        <i class="fas fa-star"></i>
                                    </label>
                                    <input type="radio" name="rating" id="star2" value="2">
                                    <label for="star2" title="Tệ (2 sao)">
                                        <i class="fas fa-star"></i>
                                    </label>
                                    <input type="radio" name="rating" id="star1" value="1">
                                    <label for="star1" title="Rất tệ (1 sao)">
                                        <i class="fas fa-star"></i>
                                    </label>
                                </div>
                                <div class="star-label mt-2" id="starLabel">
                                    <span class="text-muted">Chọn số sao để đánh giá</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label for="reviewContent" class="form-label fw-semibold">
                                Nhận xét chi tiết <span class="text-danger">*</span>
                            </label>
                            <textarea class="form-control" id="reviewContent" name="content" 
                                      rows="5" maxlength="2000"
                                      placeholder="Chia sẻ trải nghiệm của bạn về chuyến đi: thái độ tài xế, sự thoải mái của xe, độ đúng giờ..."></textarea>
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="d-flex gap-3 justify-content-end">
                    <a href="${pageContext.request.contextPath}/" class="btn btn-outline-secondary">
                        <i class="fas fa-times me-2"></i>Huỷ
                    </a>
                    <button type="submit" class="btn btn-primary btn-lg px-5" id="submitBtn">
                        <i class="fas fa-paper-plane me-2"></i>Gửi phản ánh
                        <span class="spinner-border spinner-border-sm ms-2 d-none" id="submitSpinner"></span>
                    </button>
                </div>
            </form>

        </div>
    </div>
</div>

<script>
// ── Type toggle ─────────────────────────────────────────────
const typeRadios = document.querySelectorAll('input[name="typeSelector"]');
typeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
        const type = this.value;
        document.getElementById('hiddenType').value = type;
        
        const complaintSection = document.getElementById('complaintSection');
        const reviewSection    = document.getElementById('reviewSection');
        const submitBtn        = document.getElementById('submitBtn');

        if (type === 'COMPLAINT') {
            complaintSection.classList.remove('d-none');
            reviewSection.classList.add('d-none');
            document.getElementById('content').required = true;
            document.getElementById('reviewContent').required = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Gửi khiếu nại';
        } else {
            complaintSection.classList.add('d-none');
            reviewSection.classList.remove('d-none');
            document.getElementById('content').required = false;
            document.getElementById('reviewContent').required = true;
            submitBtn.innerHTML = '<i class="fas fa-star me-2"></i>Gửi đánh giá';
        }
    });
});

// ── Char counter ────────────────────────────────────────────
document.getElementById('content').addEventListener('input', function() {
    document.getElementById('charCount').textContent = this.value.length + ' / 2000 ký tự';
});

// ── Star rating labels ──────────────────────────────────────
const starLabels = {5:'Xuất sắc ⭐⭐⭐⭐⭐', 4:'Tốt ⭐⭐⭐⭐', 3:'Bình thường ⭐⭐⭐', 2:'Tệ ⭐⭐', 1:'Rất tệ ⭐'};
document.querySelectorAll('input[name="rating"]').forEach(input => {
    input.addEventListener('change', function() {
        document.getElementById('starLabel').innerHTML =
            `<span class="fw-semibold text-warning">${starLabels[this.value]}</span>`;
    });
});

// ── Image upload preview ────────────────────────────────────
const uploadZone  = document.getElementById('uploadZone');
const imageInput  = document.getElementById('imageFile');
const placeholder = document.getElementById('uploadPlaceholder');
const preview     = document.getElementById('uploadPreview');
const previewImg  = document.getElementById('previewImg');

uploadZone.addEventListener('click', () => imageInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) showPreview(e.dataTransfer.files[0]);
});

imageInput.addEventListener('change', function() {
    if (this.files[0]) showPreview(this.files[0]);
});

function showPreview(file) {
    if (!file.type.startsWith('image/')) {
        Swal.fire({ icon:'error', title:'Lỗi', text:'Chỉ chấp nhận file ảnh!', confirmButtonColor:'#ef4444' });
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire({ icon:'error', title:'Lỗi', text:'File ảnh tối đa 5MB!', confirmButtonColor:'#ef4444' });
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        previewImg.src = e.target.result;
        placeholder.classList.add('d-none');
        preview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    imageInput.value = '';
    previewImg.src   = '';
    preview.classList.add('d-none');
    placeholder.classList.remove('d-none');
}

// ── Form submit with loading ────────────────────────────────
document.getElementById('feedbackForm').addEventListener('submit', function(e) {
    if (!this.checkValidity()) {
        e.preventDefault();
        this.classList.add('was-validated');
        return;
    }
    const btn     = document.getElementById('submitBtn');
    const spinner = document.getElementById('submitSpinner');
    btn.disabled  = true;
    spinner.classList.remove('d-none');
});
</script>

<%@ include file="/views/layout/footer.jsp" %>
