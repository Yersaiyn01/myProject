package com.expensetracker.backend.controller;

import com.expensetracker.backend.dto.IncomeDtos.IncomeRequest;
import com.expensetracker.backend.dto.IncomeDtos.IncomeResponse;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.service.CurrentUserService;
import com.expensetracker.backend.service.IncomeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class IncomeController {
    private final CurrentUserService currentUser;
    private final IncomeService incomes;

    public IncomeController(CurrentUserService currentUser, IncomeService incomes) {
        this.currentUser = currentUser;
        this.incomes = incomes;
    }

    @GetMapping({"/api/incomes", "/api/incomes/"})
    public List<IncomeResponse> all(HttpServletRequest request) {
        AppUser user = currentUser.resolve(request);
        return incomes.findAll(user);
    }

    @PostMapping({"/api/incomes", "/api/incomes/"})
    public IncomeResponse create(HttpServletRequest request, @Valid @RequestBody IncomeRequest body) {
        AppUser user = currentUser.resolve(request);
        return incomes.create(user, body);
    }
}
