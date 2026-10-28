package com.najda.backend.legal.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

/**
 * @param baseVersion         the latest version the editor started from; refused if another one was published since
 * @param changeSummary       optional, shown to users in the "we've updated our terms" prompt
 * @param requiresAcceptance  true for a material change: every user must accept it before continuing
 */
public record PublishLegalRequest(
        @NotNull Integer baseVersion,
        @NotNull LegalContent content,
        Map<String, String> changeSummary,
        boolean requiresAcceptance) {
}
