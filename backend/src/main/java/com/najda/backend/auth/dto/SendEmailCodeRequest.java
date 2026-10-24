package com.najda.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendEmailCodeRequest(
        @NotBlank @Email @Size(max = 254) String email
) {
}