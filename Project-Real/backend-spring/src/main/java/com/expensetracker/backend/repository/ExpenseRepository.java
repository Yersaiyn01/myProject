package com.expensetracker.backend.repository;

import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserOrderByDateDescIdDesc(AppUser user);

    List<Expense> findByUserAndDateBetween(AppUser user, LocalDate start, LocalDate end);
}
