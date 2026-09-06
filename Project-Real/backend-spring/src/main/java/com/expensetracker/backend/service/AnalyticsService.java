package com.expensetracker.backend.service;

import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.model.Expense;
import com.expensetracker.backend.model.Income;
import com.expensetracker.backend.repository.ExpenseRepository;
import com.expensetracker.backend.repository.IncomeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {
    private final ExpenseRepository expenses;
    private final IncomeRepository incomes;

    public AnalyticsService(ExpenseRepository expenses, IncomeRepository incomes) {
        this.expenses = expenses;
        this.incomes = incomes;
    }

    public Map<String, Object> dashboard(AppUser user) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        LocalDate previousMonthStart = monthStart.minusMonths(1);
        LocalDate previousMonthEnd = monthStart.minusDays(1);
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        LocalDate previousWeekStart = weekStart.minusWeeks(1);
        LocalDate previousWeekEnd = weekStart.minusDays(1);

        List<Expense> monthExpenses = expenses.findByUserAndDateBetween(user, monthStart, monthEnd);
        List<Expense> previousMonthExpenses = expenses.findByUserAndDateBetween(user, previousMonthStart, previousMonthEnd);
        List<Expense> weekExpenses = expenses.findByUserAndDateBetween(user, weekStart, weekEnd);
        List<Expense> previousWeekExpenses = expenses.findByUserAndDateBetween(user, previousWeekStart, previousWeekEnd);
        List<Income> monthIncomes = incomes.findByUserAndDateBetween(user, monthStart, monthEnd);

        BigDecimal totalSpent = sumExpenses(monthExpenses);
        BigDecimal previousMonthSpent = sumExpenses(previousMonthExpenses);
        BigDecimal weekSpent = sumExpenses(weekExpenses);
        BigDecimal previousWeekSpent = sumExpenses(previousWeekExpenses);
        BigDecimal totalIncome = sumIncomes(monthIncomes);
        BigDecimal dailyAverage = divide(totalSpent, BigDecimal.valueOf(today.getDayOfMonth()));
        BigDecimal monthForecast = dailyAverage.multiply(BigDecimal.valueOf(today.lengthOfMonth()));
        BigDecimal balance = totalIncome.subtract(totalSpent);
        double savingsRate = totalIncome.signum() > 0
                ? balance.max(BigDecimal.ZERO).divide(totalIncome, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0;

        List<Map<String, Object>> categoryBreakdown = categoryBreakdown(monthExpenses, totalSpent);
        Map<String, Object> topCategory = categoryBreakdown.isEmpty()
                ? Map.of("name", "No data", "amount", 0, "percent", 0)
                : categoryBreakdown.getFirst();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", Map.of(
                "total_spent", round(totalSpent),
                "total_income", round(totalIncome),
                "daily_average", round(dailyAverage),
                "month_forecast", round(monthForecast),
                "balance", round(balance),
                "transactions_this_week", weekExpenses.size(),
                "savings_rate", Math.round(savingsRate)
        ));
        response.put("top_category", topCategory);
        response.put("weekly_spending", weeklySpending(weekStart, weekExpenses));
        response.put("category_breakdown", categoryBreakdown);
        response.put("month_comparison", Map.of("percent_change", percentChange(totalSpent, previousMonthSpent)));
        response.put("weekly_comparison", Map.of("percent_change", percentChange(weekSpent, previousWeekSpent)));
        response.put("transaction_comparison", Map.of("percent_change", percentChange(
                BigDecimal.valueOf(weekExpenses.size()),
                BigDecimal.valueOf(previousWeekExpenses.size())
        )));

        response.put("totalExpenses", round(totalSpent));
        response.put("topCategories", categoryBreakdown.stream()
                .map(item -> Map.of("category", item.get("name"), "amount", item.get("total")))
                .toList());
        response.put("weeklyComparison", weeklySpending(weekStart, weekExpenses).stream()
                .map(item -> Map.of("week", item.get("day"), "amount", item.get("amount")))
                .toList());
        response.put("monthlyComparison", monthlyComparison(user, today));
        response.put("dailyAverage", round(dailyAverage));
        response.put("savingsRate", Math.round(savingsRate));

        return response;
    }

    private List<Map<String, Object>> categoryBreakdown(List<Expense> source, BigDecimal totalSpent) {
        Map<String, BigDecimal> grouped = source.stream().collect(Collectors.groupingBy(
                expense -> expense.getCategory() == null ? "Other" : expense.getCategory().getName(),
                Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
        ));

        return grouped.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(entry -> {
                    int percent = totalSpent.signum() > 0
                            ? entry.getValue().multiply(BigDecimal.valueOf(100)).divide(totalSpent, 0, RoundingMode.HALF_UP).intValue()
                            : 0;
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("name", entry.getKey());
                    item.put("total", round(entry.getValue()));
                    item.put("amount", round(entry.getValue()));
                    item.put("percent", percent);
                    return item;
                })
                .toList();
    }

    private List<Map<String, Object>> weeklySpending(LocalDate weekStart, List<Expense> weekExpenses) {
        List<Map<String, Object>> result = new ArrayList<>();
        String[] labels = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};

        for (int i = 0; i < labels.length; i += 1) {
            LocalDate date = weekStart.plusDays(i);
            BigDecimal amount = weekExpenses.stream()
                    .filter(expense -> expense.getDate().equals(date))
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(Map.of("day", labels[i], "amount", round(amount)));
        }

        return result;
    }

    private List<Map<String, Object>> monthlyComparison(AppUser user, LocalDate today) {
        List<Map<String, Object>> result = new ArrayList<>();

        for (int i = 5; i >= 0; i -= 1) {
            LocalDate month = today.minusMonths(i).withDayOfMonth(1);
            BigDecimal amount = sumExpenses(expenses.findByUserAndDateBetween(
                    user,
                    month,
                    month.withDayOfMonth(month.lengthOfMonth())
            ));
            result.add(Map.of(
                    "month",
                    month.getMonth().name().substring(0, 3),
                    "amount",
                    round(amount)
            ));
        }

        return result.stream()
                .sorted(Comparator.comparing(item -> result.indexOf(item)))
                .toList();
    }

    private BigDecimal sumExpenses(List<Expense> source) {
        return source.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumIncomes(List<Income> source) {
        return source.stream().map(Income::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal divide(BigDecimal amount, BigDecimal by) {
        return by.signum() == 0 ? BigDecimal.ZERO : amount.divide(by, 2, RoundingMode.HALF_UP);
    }

    private double round(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private double percentChange(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) {
            return current.signum() > 0 ? 100 : 0;
        }

        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous, 1, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
