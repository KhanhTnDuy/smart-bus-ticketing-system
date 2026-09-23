    </main><!-- /page-content -->
</div><!-- /main-wrapper -->

<!-- Bootstrap Bundle JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<!-- SweetAlert2 -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
<!-- Custom JS -->
<script src="${pageContext.request.contextPath}/assets/js/main.js"></script>

<script>
    // Live clock
    function updateTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent =
            now.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    }
    updateTime();
    setInterval(updateTime, 1000);

    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('mainWrapper').classList.toggle('expanded');
    });
</script>

</body>
</html>
