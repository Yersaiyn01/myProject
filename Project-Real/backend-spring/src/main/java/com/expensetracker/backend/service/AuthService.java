package com.expensetracker.backend.service;

import com.expensetracker.backend.dto.AuthDtos.AuthResponse;
import com.expensetracker.backend.dto.AuthDtos.LoginRequest;
import com.expensetracker.backend.dto.AuthDtos.RegisterRequest;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AuthService {
    private final AppUserRepository users;
    private final CategoryService categories;

    public AuthService(AppUserRepository users, CategoryService categories) {
        this.users = users;
        this.categories = categories;
    }

    public AuthResponse register(RegisterRequest request) {
        users.findByEmailIgnoreCase(request.email()).ifPresent(user -> {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User exists");
        });

        AppUser user = new AppUser();
        user.setEmail(request.email().trim().toLowerCase());
        user.setFirstName(blankToDefault(request.firstName(), "User"));
        user.setLastName(blankToDefault(request.lastName(), ""));
        user.setPassword(request.password());
        user.setAuthToken(UUID.randomUUID().toString());

        AppUser saved = users.save(user);
        categories.ensureDefaultCategories(saved);
        return toResponse(saved);
    }

    public AuthResponse login(LoginRequest request) {
        AppUser user = users.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid credentials"));

        if (!user.getPassword().equals(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid credentials");
        }

        user.setAuthToken(UUID.randomUUID().toString());
        AppUser saved = users.save(user);
        categories.ensureDefaultCategories(saved);
        return toResponse(saved);
    }

    public AuthResponse toResponse(AppUser user) {
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getAuthToken(),
                List.of("ROLE_USER")
        );
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }
}
