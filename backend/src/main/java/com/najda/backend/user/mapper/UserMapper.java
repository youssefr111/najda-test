package com.najda.backend.user.mapper;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.user.dto.UserResponse;
import com.najda.backend.user.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    private static final Logger logger = LoggerFactory.getLogger(UserMapper.class);

    public UserResponse toResponse(User user) {
        boolean emailVerified = false;
        try {
            UserRecord firebaseUser = FirebaseAuth.getInstance().getUser(user.getFirebaseUid());
            emailVerified = firebaseUser.isEmailVerified();
        } catch (Exception e) {
            logger.warn("Could not fetch emailVerified status for UID {}: {}", user.getFirebaseUid(), e.getMessage());
        }

        return new UserResponse(
                user.getId(),
                user.getFirebaseUid(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                emailVerified,
                user.getPhone(),
                user.isPhoneVerified(),
                user.getAddress(),
                user.getRole() != null ? user.getRole().getRoleName() : null,
                user.getFacility() != null ? user.getFacility().getId() : null,
                user.getFacility() != null ? user.getFacility().getName() : null,
                user.getGender(),
                user.isProfileCompleted(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}