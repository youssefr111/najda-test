package com.najda.backend.auth.dto;

import com.najda.backend.user.model.Gender;

public record RegisterCitizenRequest(
        String firstName,
        String lastName,
        String email,
        String phone,
        String address,
        Gender gender
) {
}