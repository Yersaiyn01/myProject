package com.expensetracker.backend.repository;

import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserOrderByNameAsc(AppUser user);

    Optional<Category> findByUserAndNameIgnoreCase(AppUser user, String name);
}
