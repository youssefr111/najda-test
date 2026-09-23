package com.najda.backend.user.dto;

import com.najda.backend.user.model.Gender;

public record UpdateProfileRequest(
        String firstName,
        String lastName,
        String address,
        Gender gender
) {
}