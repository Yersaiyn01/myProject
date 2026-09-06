package com.expensetracker.backend.repository;

import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.model.Income;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface IncomeRepository extends JpaRepository<Income, Long> {
    List<Income> findByUserOrderByDateDescIdDesc(AppUser user);

    List<Income> findByUserAndDateBetween(AppUser user, LocalDate start, LocalDate end);
}
