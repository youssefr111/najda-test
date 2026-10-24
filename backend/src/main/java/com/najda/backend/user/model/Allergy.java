package com.najda.backend.user.model;

/** Quick-pick allergens. Anything else goes in the free-text allergy notes. */
public enum Allergy {
    // Medications
    PENICILLIN,
    SULFA,
    ASPIRIN,
    NSAIDS,
    CODEINE,
    CONTRAST_DYE,
    // Foods
    PEANUTS,
    TREE_NUTS,
    EGGS,
    MILK,
    SHELLFISH,
    // Other
    LATEX,
    INSECT_STINGS
}