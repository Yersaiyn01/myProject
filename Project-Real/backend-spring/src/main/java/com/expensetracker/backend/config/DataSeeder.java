package com.expensetracker.backend.config;

import com.expensetracker.backend.dto.ExpenseDtos.ExpenseRequest;
import com.expensetracker.backend.dto.IncomeDtos.IncomeRequest;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.repository.ExpenseRepository;
import com.expensetracker.backend.repository.IncomeRepository;
import com.expensetracker.backend.service.CurrentUserService;
import com.expensetracker.backend.service.ExpenseService;
import com.expensetracker.backend.service.IncomeService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.LocalDate;

@Configuration
public class DataSeeder {
    @Bean
    CommandLineRunner seedDemoData(
            CurrentUserService currentUser,
            ExpenseRepository expenses,
            IncomeRepository incomes,
            ExpenseService expenseService,
            IncomeService incomeService
    ) {
        return args -> {
            AppUser demo = currentUser.demoUser();

            if (incomes.findByUserOrderByDateDescIdDesc(demo).isEmpty()) {
                incomeService.create(demo, new IncomeRequest(BigDecimal.valueOf(450000), "Salary", LocalDate.now().withDayOfMonth(1), "Monthly salary"));
            }

            if (!expenses.findByUserOrderByDateDescIdDesc(demo).isEmpty()) {
                return;
            }

            expenseService.create(demo, new ExpenseRequest("Magnum groceries", BigDecimal.valueOf(18450), "Food", null, LocalDate.now().minusDays(1), "Food and home products"));
            expenseService.create(demo, new ExpenseRequest("Taxi to university", BigDecimal.valueOf(2300), "Transport", null, LocalDate.now().minusDays(2), "Yandex Go"));
            expenseService.create(demo, new ExpenseRequest("Cinema evening", BigDecimal.valueOf(7200), "Entertainment", null, LocalDate.now().minusDays(3), "Tickets and snacks"));
            expenseService.create(demo, new ExpenseRequest("Pharmacy", BigDecimal.valueOf(5100), "Health", null, LocalDate.now().minusDays(4), "Medicine"));
            expenseService.create(demo, new ExpenseRequest("Online course", BigDecimal.valueOf(15000), "Education", null, LocalDate.now().minusDays(6), "Learning"));
            expenseService.create(demo, new ExpenseRequest("Monthly utilities", BigDecimal.valueOf(27000), "Bills", null, LocalDate.now().minusDays(8), "Apartment bills"));
            expenseService.create(demo, new ExpenseRequest("Sneakers", BigDecimal.valueOf(38990), "Shopping", null, LocalDate.now().minusDays(11), "Clothes"));
        };
    }
}
