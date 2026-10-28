package com.najda.backend.user.service;

import com.najda.backend.user.model.User;
import org.springframework.stereotype.Component;

/** Single source of truth for "is this profile actually complete", shared by AuthServiceImpl and UserServiceImpl. */
@Component
public class ProfileCompletionEvaluator {

    public boolean isComplete(User user) {
        return user.getAddressGovernorate() != null
                && hasText(user.getAddressCity())
                && hasText(user.getAddressStreet())
                && user.getGender() != null
                && hasText(user.getPhone());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}