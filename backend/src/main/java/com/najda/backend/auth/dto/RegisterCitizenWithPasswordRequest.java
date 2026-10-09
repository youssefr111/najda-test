package com.najda.backend.auth.dto;

import com.najda.backend.user.model.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Password strength is intentionally NOT re-implemented here: Firebase's
 * Password Policy is the single source of truth and rejects weak passwords.
 */
public record RegisterCitizenWithPasswordRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 128) String password,
        @NotBlank @Size(max = 128) String verificationToken,
        @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{6,14}$", message = "must be in E.164 format, e.g. +201012345678") String phone,
        @NotBlank @Size(max = 255) String address,
        @NotNull Gender gender
) {

    /** Keeps credentials out of logs if this object is ever printed. */
    @Override
    public String toString() {
        return "RegisterCitizenWithPasswordRequest[email=" + email + ", password=***, verificationToken=***]";
    }
}