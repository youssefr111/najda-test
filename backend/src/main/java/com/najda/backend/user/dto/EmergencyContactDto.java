package com.najda.backend.user.dto;

import com.najda.backend.user.model.ContactRelationship;
import com.najda.backend.validation.EgyptianMobile;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmergencyContactDto(
        @NotBlank @Size(max = 100) String name,
        @NotNull ContactRelationship relationship,
        @NotBlank @EgyptianMobile String phone
) {
}