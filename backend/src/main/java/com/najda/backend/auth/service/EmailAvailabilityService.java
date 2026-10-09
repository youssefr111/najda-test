package com.najda.backend.auth.service;

import com.google.firebase.auth.AuthErrorCode;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.najda.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** "Is this email already taken?" -- checks both stores so neither can drift ahead of the other. */
@Service
@RequiredArgsConstructor
public class EmailAvailabilityService {

    private final UserRepository userRepository;

    public boolean isTaken(String normalizedEmail) {
        return userRepository.existsByEmailIgnoreCase(normalizedEmail) || existsInFirebase(normalizedEmail);
    }

    private boolean existsInFirebase(String email) {
        try {
            FirebaseAuth.getInstance().getUserByEmail(email);
            return true;
        } catch (FirebaseAuthException e) {
            if (e.getAuthErrorCode() == AuthErrorCode.USER_NOT_FOUND) {
                return false;
            }
            throw new IllegalStateException("Could not check Firebase for email availability", e);
        }
    }
}