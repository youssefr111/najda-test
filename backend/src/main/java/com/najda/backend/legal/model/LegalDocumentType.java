package com.najda.backend.legal.model;

import com.najda.backend.exceptions.ResourceNotFoundException;
import java.util.Locale;

/** The legal documents users must accept. Adding one here (and a seed file) is all the backend needs. */
public enum LegalDocumentType {
    TERMS,
    PRIVACY;

    /** The lowercase form used in URLs and seed file names, e.g. {@code terms}. */
    public String slug() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static LegalDocumentType fromSlug(String slug) {
        for (LegalDocumentType type : values()) {
            if (type.slug().equalsIgnoreCase(slug)) {
                return type;
            }
        }
        throw new ResourceNotFoundException("Unknown legal document: " + slug);
    }
}
