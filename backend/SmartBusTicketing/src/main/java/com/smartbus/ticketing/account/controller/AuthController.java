package com.smartbus.ticketing.account.controller;

import com.smartbus.ticketing.account.entity.User;
import com.smartbus.ticketing.account.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin("*")
public class AuthController {
    @Autowired private UserRepository repo;

    public static class LoginDTO {
        public String identifier;
        public String password;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDTO dto) {
        Optional<User> uOpt = repo.findByIdentifier(dto.identifier);
        if (uOpt.isEmpty() || !uOpt.get().getPassword().equals(dto.password)) {
            throw new IllegalArgumentException("Tài khoản hoặc mật khẩu không chính xác!");
        }
        User u = uOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) {
            return ResponseEntity.status(403).body(Map.of("message", "Tài khoản bị khóa (INACTIVE)!"));
        }
        return ResponseEntity.ok(Map.of("token", "mockToken_" + u.getId(), "user", u));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        return repo.findById(1L).<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Chưa đăng nhập!")));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() { return ResponseEntity.ok(Map.of("success", true)); }
}
