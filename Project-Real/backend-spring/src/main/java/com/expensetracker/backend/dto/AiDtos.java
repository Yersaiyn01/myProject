package com.expensetracker.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class AiDtos {
    private AiDtos() {
    }

    public record ChatMessage(String role, String content) {
    }

    public record ChatRequest(
            @NotBlank String message,
            List<ChatMessage> history
    ) {
    }

    public record ChatResponse(
            String reply,
            boolean aiEnabled,
            String model,
            List<String> suggestions
    ) {
    }
}
