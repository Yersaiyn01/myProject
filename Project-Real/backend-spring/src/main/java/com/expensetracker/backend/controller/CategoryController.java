package com.expensetracker.backend.controller;

import com.expensetracker.backend.dto.CategoryDtos.CategoryRequest;
import com.expensetracker.backend.dto.CategoryDtos.CategoryResponse;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.service.CategoryService;
import com.expensetracker.backend.service.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class CategoryController {
    private final CurrentUserService currentUser;
    private final CategoryService categories;

    public CategoryController(CurrentUserService currentUser, CategoryService categories) {
        this.currentUser = currentUser;
        this.categories = categories;
    }

    @GetMapping({"/api/categories", "/api/categories/"})
    public List<CategoryResponse> all(HttpServletRequest request) {
        AppUser user = currentUser.resolve(request);
        return categories.findAll(user);
    }

    @PostMapping({"/api/categories", "/api/categories/"})
    public CategoryResponse create(HttpServletRequest request, @Valid @RequestBody CategoryRequest body) {
        AppUser user = currentUser.resolve(request);
        return categories.toResponse(categories.create(user, body));
    }
}
