package com.smartbus.ticketing.account.controller;

import com.smartbus.ticketing.account.entity.User;
import com.smartbus.ticketing.account.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin("*")
public class UserController {
    @Autowired private UserRepository repo;

    @GetMapping
    public List<User> getAll() { return repo.findAll(); }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody User user) {
        if (repo.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException("Username đã tồn tại!");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody User u) {
        return repo.findById(id).map(user -> {
            if (u.getName() != null) user.setName(u.getName());
            if (u.getEmail() != null) user.setEmail(u.getEmail());
            if (u.getPhone() != null) user.setPhone(u.getPhone());
            if (u.getRole() != null) user.setRole(u.getRole());
            if (u.getStatus() != null) user.setStatus(u.getStatus());
            return ResponseEntity.ok(repo.save(user));
        }).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user ID: " + id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return repo.findById(id).map(user -> {
            user.setStatus("INACTIVE");
            repo.save(user);
            return ResponseEntity.ok(Map.of("success", true));
        }).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user ID: " + id));
    }
}
