package com.expensetracker.backend.service;

import com.expensetracker.backend.model.AppUser;
import com.expensetracker.backend.repository.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CurrentUserService {
    private static final String DEMO_EMAIL = "demo@test.com";

    private final AppUserRepository users;
    private final CategoryService categories;

    public CurrentUserService(AppUserRepository users, CategoryService categories) {
        this.users = users;
        this.categories = categories;
    }

    public AppUser resolve(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length()).trim();
            if (!token.isEmpty()) {
                return users.findByAuthToken(token).orElseGet(this::demoUser);
            }
        }

        return demoUser();
    }

    public AppUser demoUser() {
        AppUser user = users.findByEmailIgnoreCase(DEMO_EMAIL).orElseGet(() -> {
            AppUser demo = new AppUser();
            demo.setEmail(DEMO_EMAIL);
            demo.setFirstName("Demo");
            demo.setLastName("User");
            demo.setPassword("demo123");
            return users.save(demo);
        });

        categories.ensureDefaultCategories(user);
        return user;
    }
}
