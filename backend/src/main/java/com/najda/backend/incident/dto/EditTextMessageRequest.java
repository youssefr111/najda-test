package com.najda.backend.incident.dto;
import jakarta.validation.constraints.NotBlank;

public record EditTextMessageRequest(@NotBlank String textContent) {}