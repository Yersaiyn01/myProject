package com.expensetracker.backend.service;

import com.expensetracker.backend.dto.AiDtos.ChatMessage;
import com.expensetracker.backend.dto.AiDtos.ChatRequest;
import com.expensetracker.backend.dto.AiDtos.ChatResponse;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.model.Expense;
import com.expensetracker.backend.model.Income;
import com.expensetracker.backend.repository.ExpenseRepository;
import com.expensetracker.backend.repository.IncomeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AiAdvisorService {
    private final ExpenseRepository expenses;
    private final IncomeRepository incomes;
    private final ObjectMapper mapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;

    public AiAdvisorService(
            ExpenseRepository expenses,
            IncomeRepository incomes,
            ObjectMapper mapper,
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.model:gpt-5.2}") String model
    ) {
        this.expenses = expenses;
        this.incomes = incomes;
        this.mapper = mapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null || model.isBlank() ? "gpt-5.2" : model.trim();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
    }

    public ChatResponse chat(AppUser user, ChatRequest request) {
        List<String> suggestions = suggestions();

        if (apiKey.isBlank()) {
            return new ChatResponse(localReply(user, request.message()), false, "local-fallback", suggestions);
        }

        try {
            return new ChatResponse(openAiReply(user, request), true, model, suggestions);
        } catch (Exception error) {
            return new ChatResponse(localReply(user, request.message()), false, "local-fallback", suggestions);
        }
    }

    private String openAiReply(AppUser user, ChatRequest request) throws IOException, InterruptedException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("instructions", instructions());
        payload.put("input", buildPrompt(user, request));
        payload.put("temperature", 0.35);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/responses"))
                .timeout(Duration.ofSeconds(35))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("OpenAI request failed with status " + response.statusCode());
        }

        return extractOutputText(response.body());
    }

    private String instructions() {
        return """
                You are AI Advisor, a real conversational assistant inside an expense tracker app.
                Your main specialty is personal finance: expenses, budgets, saving, goals, habit building, and practical planning.
                You can also help with adjacent everyday questions such as studying, productivity, decisions, and planning.
                Use the provided app data when it is relevant, but do not force financial analysis into unrelated questions.
                Reply in the same language as the user. Be natural, direct, practical, and specific.
                Prefer a short answer with clear next steps. Use bullet points only when they make the answer easier to act on.
                Ask at most one clarifying question if the user did not provide enough information.
                Do not claim to be a licensed financial professional. Do not present investment, tax, legal, or credit advice as guaranteed.
                """;
    }

    private String buildPrompt(AppUser user, ChatRequest request) {
        return """
                User profile:
                %s

                Current financial context from the app:
                %s

                Recent conversation:
                %s

                User message:
                %s
                """.formatted(userSummary(user), financialContext(user), conversation(request.history()), request.message());
    }

    private String userSummary(AppUser user) {
        return "email=" + user.getEmail() + ", firstName=" + nullSafe(user.getFirstName());
    }

    private String financialContext(AppUser user) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        List<Expense> monthExpenses = expenses.findByUserAndDateBetween(user, monthStart, monthEnd);
        List<Income> monthIncomes = incomes.findByUserAndDateBetween(user, monthStart, monthEnd);

        BigDecimal totalSpent = sumExpenses(monthExpenses);
        BigDecimal totalIncome = sumIncomes(monthIncomes);
        BigDecimal balance = totalIncome.subtract(totalSpent);

        Map<String, BigDecimal> byCategory = monthExpenses.stream().collect(Collectors.groupingBy(
                expense -> expense.getCategory() == null ? "Other" : expense.getCategory().getName(),
                Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
        ));

        List<Map<String, Object>> topCategories = byCategory.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(5)
                .map(entry -> Map.<String, Object>of(
                        "category", entry.getKey(),
                        "amount", round(entry.getValue())
                ))
                .toList();

        List<Map<String, Object>> recentExpenses = monthExpenses.stream()
                .sorted(Comparator.comparing(Expense::getDate).reversed())
                .limit(8)
                .map(expense -> Map.<String, Object>of(
                        "title", nullSafe(expense.getTitle()),
                        "category", expense.getCategory() == null ? "Other" : expense.getCategory().getName(),
                        "amount", round(expense.getAmount()),
                        "date", expense.getDate().toString()
                ))
                .toList();

        try {
            return mapper.writeValueAsString(Map.of(
                    "period", "current month",
                    "totalSpent", round(totalSpent),
                    "totalIncome", round(totalIncome),
                    "balanceAfterExpenses", round(balance),
                    "transactionCount", monthExpenses.size(),
                    "topCategories", topCategories,
                    "recentExpenses", recentExpenses
            ));
        } catch (IOException error) {
            return "totalSpent=" + round(totalSpent) + ", totalIncome=" + round(totalIncome);
        }
    }

    private String conversation(List<ChatMessage> history) {
        if (history == null || history.isEmpty()) {
            return "No previous messages.";
        }

        return history.stream()
                .filter(message -> message.content() != null && !message.content().isBlank())
                .skip(Math.max(0, history.size() - 10))
                .map(message -> safeRole(message.role()) + ": " + message.content().trim())
                .collect(Collectors.joining("\n"));
    }

    private String extractOutputText(String responseBody) throws IOException {
        JsonNode root = mapper.readTree(responseBody);
        JsonNode direct = root.get("output_text");
        if (direct != null && direct.isTextual() && !direct.asText().isBlank()) {
            return direct.asText();
        }

        JsonNode output = root.get("output");
        if (output != null && output.isArray()) {
            StringBuilder text = new StringBuilder();
            for (JsonNode item : output) {
                JsonNode content = item.get("content");
                if (content == null || !content.isArray()) continue;

                for (JsonNode part : content) {
                    JsonNode partText = part.get("text");
                    if (partText != null && partText.isTextual()) {
                        if (!text.isEmpty()) text.append("\n");
                        text.append(partText.asText());
                    }
                }
            }
            if (!text.isEmpty()) return text.toString();
        }

        throw new IOException("OpenAI response did not include output text");
    }

    private String localReply(AppUser user, String message) {
        LocalDate today = LocalDate.now();
        List<Expense> monthExpenses = expenses.findByUserAndDateBetween(
                user,
                today.withDayOfMonth(1),
                today.withDayOfMonth(today.lengthOfMonth())
        );
        List<Income> monthIncomes = incomes.findByUserAndDateBetween(
                user,
                today.withDayOfMonth(1),
                today.withDayOfMonth(today.lengthOfMonth())
        );

        BigDecimal spent = sumExpenses(monthExpenses);
        BigDecimal income = sumIncomes(monthIncomes);
        BigDecimal balance = income.subtract(spent);
        String topCategory = topCategory(monthExpenses);
        String lower = message == null ? "" : message.toLowerCase();

        if (lower.contains("сэконом") || lower.contains("save") || lower.contains("эконом")) {
            return """
                    Я бы начал с категории %s: это сейчас самый заметный расход.

                    План на 7 дней:
                    1. Поставь недельный лимит для этой категории.
                    2. Перед покупкой жди 10 минут и спрашивай себя: это нужно сегодня?
                    3. Одну необязательную покупку сразу перенеси в накопления.

                    За месяц потрачено примерно %s, после доходов остаётся около %s.
                    """.formatted(topCategory, money(spent), money(balance.max(BigDecimal.ZERO)));
        }

        if (lower.contains("бюджет") || lower.contains("budget")) {
            return """
                    Сделай бюджет простым:
                    1. Сначала обязательные расходы.
                    2. Потом фиксированная сумма на цель или накопления.
                    3. Остальное дели на недельные лимиты.

                    По текущим данным: расходы %s, доходы %s, главная категория %s.
                    """.formatted(money(spent), money(income), topCategory);
        }

        if (lower.contains("цель") || lower.contains("goal")) {
            return """
                    Для цели выбери сумму и срок, потом раздели сумму на количество месяцев.
                    Если ежемесячный платёж больше 20-30%% свободного остатка, лучше увеличить срок.

                    Сейчас свободный остаток после расходов около %s.
                    """.formatted(money(balance.max(BigDecimal.ZERO)));
        }

        return """
                Я могу помочь как обычный AI-чат, но сейчас работаю в локальном fallback режиме, потому что OpenAI API key не подключён.

                По твоим данным: за месяц потрачено около %s, главная категория расходов: %s.

                Спроси конкретно: как сэкономить, как составить бюджет, какие траты сократить, как быстрее накопить на цель или как спланировать день.
                """.formatted(money(spent), topCategory);
    }

    private List<String> suggestions() {
        return List.of(
                "Как мне сэкономить в этом месяце?",
                "Составь бюджет по моим расходам",
                "Какие траты стоит сократить первыми?",
                "Как быстрее накопить на цель?"
        );
    }

    private BigDecimal sumExpenses(List<Expense> source) {
        return source.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumIncomes(List<Income> source) {
        return source.stream().map(Income::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String topCategory(List<Expense> source) {
        return source.stream().collect(Collectors.groupingBy(
                        expense -> expense.getCategory() == null ? "Other" : expense.getCategory().getName(),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                ))
                .entrySet()
                .stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("Other");
    }

    private double round(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private String money(BigDecimal amount) {
        return "₸" + amount.setScale(0, RoundingMode.HALF_UP);
    }

    private String safeRole(String role) {
        return "assistant".equals(role) ? "assistant" : "user";
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
