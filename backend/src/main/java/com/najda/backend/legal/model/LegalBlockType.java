package com.najda.backend.legal.model;

public enum LegalBlockType {
    /** A sub-heading inside a section. */
    HEADING,
    PARAGRAPH,
    /** A highlighted callout, for something the reader must not miss. */
    NOTICE,
    /** A bulleted list. */
    LIST
}
