package com.expensetracker.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class ExpenseDtos {
    private ExpenseDtos() {
    }

    public record ExpenseRequest(
            String title,
            @NotNull BigDecimal amount,
            Object category,
            @JsonProperty("category_name") String categoryName,
            LocalDate date,
            String description
    ) {
    }

    public record ExpenseResponse(
            Long id,
            String title,
            BigDecimal amount,
            Long category,
            @JsonProperty("category_name") String categoryName,
            LocalDate date,
            String description,
            @JsonProperty("user") Long userId
    ) {
    }
}
