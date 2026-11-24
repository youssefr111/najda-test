package com.najda.backend.content;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Shared rules for admin-edited texts that exist in several languages ({"en": "...", "ar": "..."}). */
public final class LocalizedTextValidator {

    /** Every text must be provided in each of these languages. To support another one, add its code here. */
    public static final List<String> LANGUAGES = List.of("en", "ar");

    private LocalizedTextValidator() {
    }

    /**
     * Trims a translated text and checks it, appending every problem found. A required text must have
     * every language; an optional one may be absent altogether, but never half-translated.
     *
     * @return the cleaned text, or null when an absent text was allowed
     */
    @SuppressWarnings("null")
    public static Map<String, String> validate(Map<String, String> raw, String where, int max, boolean required,
                                               List<String> problems) {
        boolean absent = raw == null || raw.values().stream().allMatch(v -> v == null || v.isBlank());
        if (absent) {
            if (required) {
                problems.add(where + " is empty.");
            }
            return null;
        }

        for (String language : raw.keySet()) {
            if (!LANGUAGES.contains(language)) {
                problems.add(where + ": unsupported language '" + language + "'.");
            }
        }
        Map<String, String> clean = new LinkedHashMap<>();
        for (String language : LANGUAGES) {
            String value = raw.get(language) == null ? "" : raw.get(language).trim();
            if (value.isEmpty()) {
                problems.add(where + " is missing the " + language + " translation.");
            } else if (value.length() > max) {
                problems.add(where + " (" + language + ") is longer than " + max + " characters.");
            }
            clean.put(language, value);
        }
        return clean;
    }
}
