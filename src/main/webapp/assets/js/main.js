/**
 * Smart Bus Ticketing — Member C
 * Main JavaScript
 */

// ============================================================
// Auto-dismiss alerts after 5s
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.alert:not(.alert-permanent)').forEach(function (alert) {
        setTimeout(function () {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) bsAlert.close();
        }, 5000);
    });

    // Tooltip init
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
        new bootstrap.Tooltip(el);
    });

    // Initialize date constraints: toDate >= fromDate
    const fromDate = document.querySelector('input[name="fromDate"]');
    const toDate   = document.querySelector('input[name="toDate"]');
    if (fromDate && toDate) {
        fromDate.addEventListener('change', function () {
            if (toDate.value && toDate.value < this.value) {
                toDate.value = this.value;
            }
            toDate.min = this.value;
        });
        toDate.addEventListener('change', function () {
            if (fromDate.value && fromDate.value > this.value) {
                fromDate.value = this.value;
            }
            fromDate.max = this.value;
        });
    }
});

// ============================================================
// Format datetime (fallback for JSP fmt:formatDate)
// ============================================================
function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN');
}

// ============================================================
// Confirm delete / dangerous action
// ============================================================
function confirmAction(message, onConfirm) {
    Swal.fire({
        title: 'Xác nhận?',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Huỷ',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280'
    }).then(result => {
        if (result.isConfirmed && typeof onConfirm === 'function') {
            onConfirm();
        }
    });
}

// ============================================================
// Toast notification helper
// ============================================================
function showToast(icon, title, timer = 2000) {
    Swal.fire({
        icon, title, timer,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        timerProgressBar: true
    });
}

// ============================================================
// Mobile sidebar overlay
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    const sidebar     = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    if (!sidebar || !mainWrapper) return;

    // On mobile: toggle open class instead of collapsed
    if (window.innerWidth <= 768) {
        document.getElementById('sidebarToggle')?.addEventListener('click', function () {
            sidebar.classList.toggle('mobile-open');
        });
        // Close sidebar when clicking outside
        mainWrapper.addEventListener('click', function () {
            sidebar.classList.remove('mobile-open');
        });
    }
});
