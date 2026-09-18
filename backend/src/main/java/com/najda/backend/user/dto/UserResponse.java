package com.najda.backend.user.dto;

import com.najda.backend.user.model.Gender;
import java.time.LocalDateTime;

/** What gets returned to clients -- deliberately not the User entity itself
    (which implements UserDetails and would leak getAuthorities()/getPassword()
    into the JSON shape). */
public record UserResponse(
        Long id,
        String firebaseUid,
        String firstName,
        String lastName,
        String email,
        boolean emailVerified,
        String phone,
        boolean phoneVerified,
        String address,
        String roleName,
        Long facilityId, 
        String facilityName,
        Gender gender,
        boolean profileCompleted,
        boolean enabled,
        LocalDateTime createdAt
) {
}