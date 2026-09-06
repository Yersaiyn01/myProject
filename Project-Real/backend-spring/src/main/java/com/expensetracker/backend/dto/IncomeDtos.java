package com.expensetracker.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class IncomeDtos {
    private IncomeDtos() {
    }

    public record IncomeRequest(
            @NotNull BigDecimal amount,
            String source,
            LocalDate date,
            String description
    ) {
    }

    public record IncomeResponse(
            Long id,
            BigDecimal amount,
            String source,
            LocalDate date,
            String description,
            @JsonProperty("user") Long userId
    ) {
    }
}
