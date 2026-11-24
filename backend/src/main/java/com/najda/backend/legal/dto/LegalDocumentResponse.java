package com.najda.backend.legal.dto;

import com.najda.backend.legal.model.LegalDocumentType;
import java.time.Instant;

public record LegalDocumentResponse(
        LegalDocumentType type,
        int version,
        Instant publishedAt,
        boolean requiresAcceptance,
        LegalContent content) {
}
