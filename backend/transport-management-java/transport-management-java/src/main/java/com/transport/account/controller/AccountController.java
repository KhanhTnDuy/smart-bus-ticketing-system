package com.transport.account.controller;

import com.transport.account.model.Account;
import com.transport.account.model.Role;
import com.transport.account.service.AccountService;

public class AccountController {
    private final AccountService service;

    public AccountController(AccountService service) {
        this.service = service;
    }

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
}
