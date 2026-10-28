package com.najda.backend.user.dto;

import com.najda.backend.user.model.Gender;
import jakarta.validation.Valid;

public record UpdateProfileRequest(
        String firstName,
        String lastName,
        Gender gender,
        @Valid AddressRequest addressDetails
) {
}
