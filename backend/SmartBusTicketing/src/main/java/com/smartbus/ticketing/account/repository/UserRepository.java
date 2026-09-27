package com.smartbus.ticketing.account.repository;

import com.smartbus.ticketing.account.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @Query("SELECT u FROM User u WHERE u.username = :id OR u.email = :id")
    Optional<User> findByIdentifier(@Param("id") String id);

    boolean existsByUsername(String username);
}
