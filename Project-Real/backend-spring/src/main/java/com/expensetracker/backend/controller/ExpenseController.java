package com.expensetracker.backend.controller;

import com.expensetracker.backend.dto.ExpenseDtos.ExpenseRequest;
import com.expensetracker.backend.dto.ExpenseDtos.ExpenseResponse;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.service.CurrentUserService;
import com.expensetracker.backend.service.ExpenseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class ExpenseController {
    private final CurrentUserService currentUser;
    private final ExpenseService expenses;

    public ExpenseController(CurrentUserService currentUser, ExpenseService expenses) {
        this.currentUser = currentUser;
        this.expenses = expenses;
    }

    @GetMapping({"/api/expenses", "/api/expenses/"})
    public List<ExpenseResponse> all(HttpServletRequest request) {
        AppUser user = currentUser.resolve(request);
        return expenses.findAll(user);
    }

    @PostMapping({"/api/expenses", "/api/expenses/"})
    public ExpenseResponse create(HttpServletRequest request, @Valid @RequestBody ExpenseRequest body) {
        AppUser user = currentUser.resolve(request);
        return expenses.create(user, body);
    }

    @PutMapping({"/api/expenses/{id}", "/api/expenses/{id}/"})
    public ExpenseResponse update(
            HttpServletRequest request,
            @PathVariable Long id,
            @Valid @RequestBody ExpenseRequest body
    ) {
        AppUser user = currentUser.resolve(request);
        return expenses.update(user, id, body);
    }

    @DeleteMapping({"/api/expenses/{id}", "/api/expenses/{id}/"})
    public Map<String, String> delete(HttpServletRequest request, @PathVariable Long id) {
        AppUser user = currentUser.resolve(request);
        expenses.delete(user, id);
        return Map.of("status", "deleted");
    }
}
