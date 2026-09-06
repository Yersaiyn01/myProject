package com.expensetracker.backend.controller;

import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.service.AnalyticsService;
import com.expensetracker.backend.service.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AnalyticsController {
    private final CurrentUserService currentUser;
    private final AnalyticsService analytics;

    public AnalyticsController(CurrentUserService currentUser, AnalyticsService analytics) {
        this.currentUser = currentUser;
        this.analytics = analytics;
    }

    @GetMapping({"/api/analytics", "/api/analytics/"})
    public Map<String, Object> dashboard(HttpServletRequest request) {
        AppUser user = currentUser.resolve(request);
        return analytics.dashboard(user);
    }
}
