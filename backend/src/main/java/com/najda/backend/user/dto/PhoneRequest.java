package com.najda.backend.user.dto;

import com.najda.backend.validation.EgyptianMobile;
import jakarta.validation.constraints.NotBlank;

public record PhoneRequest(@NotBlank @EgyptianMobile String phone) {
}