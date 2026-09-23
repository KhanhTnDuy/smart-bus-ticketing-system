package com.transport.account.repository;

import com.transport.account.model.Account;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class AccountRepository {
    private final List<Account> accounts = new ArrayList<>();

    public void save(Account account) {
        accounts.add(account);
    }

    public Optional<Account> findById(String id) {
        return accounts.stream()
                .filter(a -> a.getId().equalsIgnoreCase(id))
                .findFirst();
    }

    public Optional<Account> findByUsername(String username) {
        return accounts.stream()
                .filter(a -> a.getUsername().equalsIgnoreCase(username))
                .findFirst();
    }

    public List<Account> findAll() {
        return new ArrayList<>(accounts);
    }

    public boolean deleteById(String id) {
        return accounts.removeIf(a -> a.getId().equalsIgnoreCase(id));
    }
}
