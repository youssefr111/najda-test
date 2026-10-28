package com.najda.backend.legal.model;

import java.time.Instant;

/**
 * One immutable, published revision of a legal document. {@code content} and {@code changeSummary}
 * are the raw JSON as stored.
 *
 * @param requiresAcceptance a material change: everyone must accept it again before continuing
 */
public record LegalVersion(
        long id,
        LegalDocumentType type,
        int version,
        String content,
        String changeSummary,
        boolean requiresAcceptance,
        Instant publishedAt,
        Long publishedBy) {
}
