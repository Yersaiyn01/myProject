package com.expensetracker.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {
    @GetMapping("/api/test/user")
    public String user() {
        return "User Content.";
    }

    @GetMapping("/api/test/mod")
    public String moderator() {
        return "Moderator Board.";
    }

    @GetMapping("/api/test/admin")
    public String admin() {
        return "Admin Board.";
    }
}
