package com.expensetracker.backend.service;

import com.expensetracker.backend.dto.IncomeDtos.IncomeRequest;
import com.expensetracker.backend.dto.IncomeDtos.IncomeResponse;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.model.Income;
import com.expensetracker.backend.repository.IncomeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class IncomeService {
    private final IncomeRepository incomes;

    public IncomeService(IncomeRepository incomes) {
        this.incomes = incomes;
    }

    public List<IncomeResponse> findAll(AppUser user) {
        return incomes.findByUserOrderByDateDescIdDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    public IncomeResponse create(AppUser user, IncomeRequest request) {
        Income income = new Income();
        income.setUser(user);
        income.setAmount(request.amount() == null ? BigDecimal.ZERO : request.amount());
        income.setSource(defaultString(request.source(), "Income"));
        income.setDate(request.date() == null ? LocalDate.now() : request.date());
        income.setDescription(defaultString(request.description(), ""));
        return toResponse(incomes.save(income));
    }

    private IncomeResponse toResponse(Income income) {
        return new IncomeResponse(
                income.getId(),
                income.getAmount(),
                income.getSource(),
                income.getDate(),
                income.getDescription(),
                income.getUser().getId()
        );
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }
}
