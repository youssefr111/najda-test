package com.najda.backend.user.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminPhoneVerificationRequest(@NotNull Boolean verified, @Size(max = 200) String note) {}