package com.najda.backend.user.service;

import com.najda.backend.user.model.User;
import org.springframework.stereotype.Component;

/** Single source of truth for "is this profile actually complete" --
    shared by AuthServiceImpl and UserServiceImpl, which each used to carry
    their own copy of this logic. 
*/
@Component
public class ProfileCompletionEvaluator {
    public boolean isComplete(User user) {
        return user.getAddress() != null && !user.getAddress().isBlank()
                && user.getGender() != null
                && user.getPhone() != null && !user.getPhone().isBlank();
    }
}