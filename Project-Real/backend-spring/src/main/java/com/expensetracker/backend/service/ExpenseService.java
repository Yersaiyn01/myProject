package com.expensetracker.backend.service;

import com.expensetracker.backend.dto.ExpenseDtos.ExpenseRequest;
import com.expensetracker.backend.dto.ExpenseDtos.ExpenseResponse;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.model.Category;
import com.expensetracker.backend.model.Expense;
import com.expensetracker.backend.repository.CategoryRepository;
import com.expensetracker.backend.repository.ExpenseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class ExpenseService {
    private final ExpenseRepository expenses;
    private final CategoryRepository categories;
    private final CategoryService categoryService;

    public ExpenseService(ExpenseRepository expenses, CategoryRepository categories, CategoryService categoryService) {
        this.expenses = expenses;
        this.categories = categories;
        this.categoryService = categoryService;
    }

    public List<ExpenseResponse> findAll(AppUser user) {
        return expenses.findByUserOrderByDateDescIdDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    public ExpenseResponse create(AppUser user, ExpenseRequest request) {
        Expense expense = new Expense();
        applyRequest(user, expense, request);
        return toResponse(expenses.save(expense));
    }

    public ExpenseResponse update(AppUser user, Long id, ExpenseRequest request) {
        Expense expense = expenses.findById(id)
                .filter(item -> item.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));

        applyRequest(user, expense, request);
        return toResponse(expenses.save(expense));
    }

    public void delete(AppUser user, Long id) {
        Expense expense = expenses.findById(id)
                .filter(item -> item.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        expenses.delete(expense);
    }

    public ExpenseResponse toResponse(Expense expense) {
        Category category = expense.getCategory();
        return new ExpenseResponse(
                expense.getId(),
                expense.getTitle(),
                expense.getAmount(),
                category != null ? category.getId() : null,
                category != null ? category.getName() : "Other",
                expense.getDate(),
                expense.getDescription(),
                expense.getUser().getId()
        );
    }

    private void applyRequest(AppUser user, Expense expense, ExpenseRequest request) {
        BigDecimal amount = request.amount() == null ? BigDecimal.ZERO : request.amount();
        if (amount.signum() < 0) {
            amount = amount.abs();
        }

        expense.setUser(user);
        expense.setTitle(defaultString(request.title(), request.description(), "Transaction"));
        expense.setAmount(amount);
        expense.setCategory(resolveCategory(user, request));
        expense.setDate(request.date() == null ? LocalDate.now() : request.date());
        expense.setDescription(defaultString(request.description(), request.title(), ""));
    }

    private Category resolveCategory(AppUser user, ExpenseRequest request) {
        Object value = request.category();

        if (value instanceof Number number) {
            Long id = number.longValue();
            return categories.findById(id)
                    .filter(category -> category.getUser().getId().equals(user.getId()))
                    .orElseGet(() -> categoryService.findOrCreate(user, request.categoryName()));
        }

        if (value instanceof String text && !text.trim().isEmpty()) {
            return categoryService.findOrCreate(user, text);
        }

        return categoryService.findOrCreate(user, request.categoryName());
    }

    private String defaultString(String first, String second, String fallback) {
        if (first != null && !first.trim().isEmpty()) return first.trim();
        if (second != null && !second.trim().isEmpty()) return second.trim();
        return fallback;
    }
}
