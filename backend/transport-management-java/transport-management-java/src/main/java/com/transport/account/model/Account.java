package com.transport.account.model;

public class Account {
    // SCRUM-11: mật khẩu demo mặc định, khớp với tài khoản demo phía frontend (password123)
    public static final String DEFAULT_PASSWORD = "password123";

    private String id;
    private String username;
    private String fullName;
    private Role role;
    private boolean active;
    private String password;

    public Account(String id, String username, String fullName, Role role) {
        this(id, username, fullName, role, DEFAULT_PASSWORD);
    }

    public Account(String id, String username, String fullName, Role role, String password) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
        this.active = true;
        this.password = password;
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
    public boolean isActive() { return active; }

    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setRole(Role role) { this.role = role; }
    public void setActive(boolean active) { this.active = active; }
    public void setPassword(String password) { this.password = password; }

    public boolean checkPassword(String candidate) {
        return password != null && password.equals(candidate);
    }

    @Override
    public String toString() {
        return String.format(
                "Account{id='%s', username='%s', fullName='%s', role=%s, active=%s}",
                id, username, fullName, role, active
        );
    }
}
