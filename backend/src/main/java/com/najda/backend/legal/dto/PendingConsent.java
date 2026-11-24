package com.najda.backend.legal.dto;

import com.najda.backend.legal.model.LegalDocumentType;
import java.time.Instant;
import java.util.Map;

/** A document the person still has to accept: always the latest published version. */
public record PendingConsent(
        LegalDocumentType type,
        long versionId,
        int version,
        Map<String, String> title,
        Map<String, String> changeSummary,
        Instant publishedAt) {
}
