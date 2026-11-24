package com.najda.backend.guidance.dto;

import jakarta.validation.constraints.NotNull;

/** @param baseVersion the version the editor loaded; the save is refused if it has moved on */
public record UpdateGuidanceRequest(@NotNull Long baseVersion, @NotNull GuidanceContent content) {
}
