package com.transport.account.controller;

import com.transport.account.model.Account;
import com.transport.account.model.Role;
import com.transport.account.service.AccountService;

public class AccountController {
    private final AccountService service;

    public AccountController(AccountService service) {
        this.service = service;
    }

    // ── Các hàm dưới đây KHÔNG kiểm tra quyền, chỉ dùng để khởi tạo dữ liệu hệ
    // thống lúc chưa có tài khoản nào (bootstrap). Không expose ra API/giao diện.
    public void add(String id, String username, String fullName, Role role) {
        service.add(id, username, fullName, role);
        System.out.println("[OK] Đã thêm tài khoản: " + username);
    }

    public void list() {
        System.out.println("Danh sách tài khoản:");
        service.getAll().forEach(account -> System.out.println("  " + account));
    }

    public void update(String id, String fullName, Role role) {
        service.update(id, fullName, role);
        System.out.println("[OK] Đã cập nhật tài khoản: " + id);
    }

    public void delete(String id) {
        service.delete(id);
        System.out.println("[OK] Đã xóa tài khoản: " + id);
    }

    // ── SCRUM-11: các hàm có "requester" dùng cho người dùng thật, luôn kiểm
    // tra đăng nhập và quyền QUAN_LY_TAI_KHOAN (chỉ Admin) trước khi thực hiện.

    public Account login(String username, String password) {
        Account account = service.login(username, password);
        System.out.println("[OK] Đăng nhập thành công: " + account.getUsername() + " (" + account.getRole() + ")");
        return account;
    }

    public void logout(String requester) {
        service.logout(requester);
        System.out.println("[OK] Đã đăng xuất: " + requester);
    }

    public void add(String requester, String id, String username, String fullName, Role role) {
        requireManageAccountPermission(requester);
        add(id, username, fullName, role);
    }

    public void list(String requester) {
        requireManageAccountPermission(requester);
        list();
    }

    public void update(String requester, String id, String fullName, Role role) {
        requireManageAccountPermission(requester);
        update(id, fullName, role);
    }

    public void delete(String requester, String id) {
        requireManageAccountPermission(requester);
        delete(id);
    }

    private void requireManageAccountPermission(String requester) {
        if (requester == null || requester.isBlank()) {
            throw new SecurityException("Chưa đăng nhập.");
        }
        if (!service.hasPermission(requester, AccountService.PERMISSION_QUAN_LY_TAI_KHOAN)) {
            throw new SecurityException("Chỉ Admin được phép quản lý tài khoản.");
        }
    }
}
