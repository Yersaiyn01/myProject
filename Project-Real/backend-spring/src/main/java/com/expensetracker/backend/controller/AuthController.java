package com.expensetracker.backend.controller;

import com.expensetracker.backend.dto.AuthDtos.AuthResponse;
import com.expensetracker.backend.dto.AuthDtos.LoginRequest;
import com.expensetracker.backend.dto.AuthDtos.RegisterRequest;
import com.expensetracker.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping({"/api/login", "/api/login/"})
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request);
    }

    @PostMapping({"/api/register", "/api/register/"})
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return auth.register(request);
    }
}
