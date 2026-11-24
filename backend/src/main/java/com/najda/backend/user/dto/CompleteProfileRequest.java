package com.najda.backend.user.dto;

import com.najda.backend.user.model.Gender;
import com.najda.backend.validation.EgyptianMobile;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Everything a signed-in-but-incomplete account (in practice, a Google sign-up) must provide, in one request.
 * {@code phone} is optional: omit it when the account already has a verified number. The address is the
 * structured {@code addressDetails} (current clients).
 */
public record CompleteProfileRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Valid AddressRequest addressDetails,
        @NotNull Gender gender,
        @EgyptianMobile String phone) {
}
