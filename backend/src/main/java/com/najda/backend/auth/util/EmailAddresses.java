package com.najda.backend.auth.util;

import java.util.Locale;

public final class EmailAddresses {

    private EmailAddresses() {
    }

    /** Canonical form used everywhere an email is stored, compared, or hashed. */
    public static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}