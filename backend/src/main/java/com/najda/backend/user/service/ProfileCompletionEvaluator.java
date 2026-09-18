package com.najda.backend.user.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.user.model.User;
import java.util.Arrays;
import org.springframework.stereotype.Component;

/** Single source of truth for "is this profile actually complete" --
    shared by AuthServiceImpl and UserServiceImpl, which each used to carry
    their own copy of this logic. Password status can't be a stored column
    (it's Firebase-owned state, not ours) -- checked live, same precedent
    already established for emailVerified. */
@Component
public class ProfileCompletionEvaluator {

    public boolean isComplete(User user) {
        return user.getAddress() != null && !user.getAddress().isBlank()
                && user.getGender() != null
                && user.getPhone() != null && !user.getPhone().isBlank()
                && hasPasswordProvider(user.getFirebaseUid());
    }

    private boolean hasPasswordProvider(String firebaseUid) {
        try {
            UserRecord record = FirebaseAuth.getInstance().getUser(firebaseUid);
            return Arrays.stream(record.getProviderData())
                    .anyMatch(p -> "password".equals(p.getProviderId()));
        } catch (Exception e) {
            return false; // fail closed -- never claim complete without confirming it
        }
    }
}