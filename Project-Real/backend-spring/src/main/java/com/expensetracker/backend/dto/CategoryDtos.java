package com.expensetracker.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public final class CategoryDtos {
    private CategoryDtos() {
    }

    public record CategoryRequest(@NotBlank String name) {
    }

    public record CategoryResponse(Long id, String name, @JsonProperty("user") Long userId) {
    }
}
