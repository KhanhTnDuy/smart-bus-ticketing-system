package com.transport.account.model;

public class Account {
    private String id;
    private String username;
    private String fullName;
    private Role role;
    private boolean active;

    public Account(String id, String username, String fullName, Role role) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
        this.active = true;
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
    public boolean isActive() { return active; }

    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setRole(Role role) { this.role = role; }
    public void setActive(boolean active) { this.active = active; }

    @Override
    public String toString() {
        return String.format(
                "Account{id='%s', username='%s', fullName='%s', role=%s, active=%s}",
                id, username, fullName, role, active
        );
    }
}
