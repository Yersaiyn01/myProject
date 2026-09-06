package com.expensetracker.backend.service;

import com.expensetracker.backend.dto.CategoryDtos.CategoryRequest;
import com.expensetracker.backend.dto.CategoryDtos.CategoryResponse;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.model.Category;
import com.expensetracker.backend.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CategoryService {
    public static final List<String> DEFAULT_NAMES = List.of(
            "Food",
            "Transport",
            "Shopping",
            "Entertainment",
            "Health",
            "Bills",
            "Education",
            "Other"
    );

    private final CategoryRepository categories;

    public CategoryService(CategoryRepository categories) {
        this.categories = categories;
    }

    public List<CategoryResponse> findAll(AppUser user) {
        ensureDefaultCategories(user);
        return categories.findByUserOrderByNameAsc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    public Category create(AppUser user, CategoryRequest request) {
        return findOrCreate(user, request.name());
    }

    public Category findOrCreate(AppUser user, String rawName) {
        String name = normalize(rawName);
        return categories.findByUserAndNameIgnoreCase(user, name).orElseGet(() -> {
            Category category = new Category();
            category.setName(name);
            category.setUser(user);
            return categories.save(category);
        });
    }

    public void ensureDefaultCategories(AppUser user) {
        DEFAULT_NAMES.forEach(name -> findOrCreate(user, name));
    }

    public CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getUser().getId());
    }

    private String normalize(String rawName) {
        if (rawName == null || rawName.trim().isEmpty()) {
            return "Other";
        }

        return rawName.trim();
    }
}
