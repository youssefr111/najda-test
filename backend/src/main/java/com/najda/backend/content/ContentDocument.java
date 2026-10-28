package com.najda.backend.content;

import java.time.Instant;

/**
 * One row of {@code content_documents}: an admin-editable JSON document
 * (guidance cards today, anything similar tomorrow) with an optimistic version.
 */
public record ContentDocument(String key, String json, long version, Instant updatedAt, Long updatedBy) {
}
