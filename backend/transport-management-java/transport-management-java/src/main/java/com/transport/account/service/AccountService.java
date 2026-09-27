package com.transport.account.service;

import com.transport.account.model.Account;
import com.transport.account.model.Role;
import com.transport.account.repository.AccountRepository;
import com.transport.audit.service.AuditLogService;

import java.util.List;
import java.util.Set;

public class AccountService {
    // SCRUM-11: quyền quản lý tài khoản, chỉ Admin (hasPermission trả về true cho mọi permission)
    public static final String PERMISSION_QUAN_LY_TAI_KHOAN = "QUAN_LY_TAI_KHOAN";

    private final AccountRepository repository = new AccountRepository();
    private final AuditLogService auditLogService;

    public AccountService(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /**
     * SCRUM-11: Kiểm tra đăng nhập. Từ chối username/mật khẩu sai hoặc tài khoản đã bị khóa (active=false).
     */
    public Account login(String username, String password) {
        Account account = repository.findByUsername(username)
                .orElseThrow(() -> new SecurityException("Sai tên đăng nhập hoặc mật khẩu."));

        if (!account.checkPassword(password)) {
            throw new SecurityException("Sai tên đăng nhập hoặc mật khẩu.");
        }
        if (!account.isActive()) {
            throw new SecurityException("Tài khoản đã bị khóa.");
        }

        auditLogService.log(username, "DANG_NHAP");
        return account;
    }

    public void logout(String username) {
        auditLogService.log(username, "DANG_XUAT");
    }

    public Account add(String id, String username, String fullName, Role role) {
        if (repository.findById(id).isPresent()) {
            throw new IllegalArgumentException("ID tài khoản đã tồn tại.");
        }
        if (repository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username đã tồn tại.");
        }

        Account account = new Account(id, username, fullName, role);
        repository.save(account);
        auditLogService.log(username, "THEM_TAI_KHOAN");
        return account;
    }

    public List<Account> getAll() {
        return repository.findAll();
    }

    public void update(String id, String fullName, Role role) {
        Account account = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản."));

        account.setFullName(fullName);
        account.setRole(role);
        auditLogService.log(account.getUsername(), "SUA_TAI_KHOAN");
    }

    public void delete(String id) {
        Account account = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản."));

        repository.deleteById(id);
        auditLogService.log(account.getUsername(), "XOA_TAI_KHOAN");
    }

    public boolean hasPermission(String username, String permission) {
        Account account = repository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản."));

        // SCRUM-11: tài khoản bị khóa (active=false) không còn quyền gì, kể cả Admin
        if (!account.isActive()) {
            return false;
        }

        return switch (account.getRole()) {
            case ADMIN -> true;
            case MANAGER -> Set.of(
                    "QUAN_LY_TUYEN",
                    "QUAN_LY_TRAM",
                    "QUAN_LY_GIA_VE",
                    "QUAN_LY_PHAN_ANH"
            ).contains(permission);
            case DRIVER -> Set.of(
                    "XEM_TUYEN",
                    "XEM_LICH_CHAY",
                    "SOAT_VE"
            ).contains(permission);
            case CONDUCTOR -> Set.of(
                    "XEM_TUYEN",
                    "XEM_LICH_CHAY",
                    "SOAT_VE"
            ).contains(permission);
            case PASSENGER -> Set.of(
                    "XEM_TUYEN",
                    "GUI_PHAN_ANH",
                    "DANH_GIA"
            ).contains(permission);
        };
    }
}
