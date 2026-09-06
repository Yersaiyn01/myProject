package com.expensetracker.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @JsonProperty("first_name") String firstName,
            @JsonProperty("last_name") String lastName,
            @NotBlank String password
    ) {
    }

    public record AuthResponse(
            Long id,
            String email,
            @JsonProperty("first_name") String firstName,
            @JsonProperty("last_name") String lastName,
            String token,
            List<String> roles
    ) {
    }
}
