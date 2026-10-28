package com.najda.backend.legal.dto;

import java.time.Instant;
import java.util.Map;

/** One line of a document's revision history (no body). */
public record LegalVersionSummary(
        int version,
        Instant publishedAt,
        boolean requiresAcceptance,
        Map<String, String> changeSummary) {
}
