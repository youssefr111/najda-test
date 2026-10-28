package com.najda.backend.guidance.dto;

import java.util.List;
import java.util.Map;

/**
 * One guidance card. Every text is a map of language code to text, e.g.
 * {@code {"en": "...", "ar": "..."}}.
 *
 * @param id         stable slug, unique across the whole document
 * @param general    the category's main card: always shown first and opened
 * @param minInjured only show the card when the report has at least this many injured people (null = always)
 * @param warning    optional highlighted note shown under the steps (null = none)
 */
public record GuidanceCard(
        String id,
        boolean general,
        Integer minInjured,
        Map<String, String> title,
        List<Map<String, String>> steps,
        Map<String, String> warning) {
}
