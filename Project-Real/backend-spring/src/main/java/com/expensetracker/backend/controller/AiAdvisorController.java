package com.expensetracker.backend.controller;

import com.expensetracker.backend.dto.AiDtos.ChatRequest;
import com.expensetracker.backend.dto.AiDtos.ChatResponse;
import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.service.AiAdvisorService;
import com.expensetracker.backend.service.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiAdvisorController {
    private final CurrentUserService currentUser;
    private final AiAdvisorService aiAdvisor;

    public AiAdvisorController(CurrentUserService currentUser, AiAdvisorService aiAdvisor) {
        this.currentUser = currentUser;
        this.aiAdvisor = aiAdvisor;
    }

    @PostMapping({"/api/ai/chat", "/api/ai/chat/"})
    public ChatResponse chat(HttpServletRequest request, @Valid @RequestBody ChatRequest body) {
        AppUser user = currentUser.resolve(request);
        return aiAdvisor.chat(user, body);
    }
}
