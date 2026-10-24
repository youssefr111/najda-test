package com.najda.backend.legal.service;

/** The person has not accepted the latest terms / privacy policy. Mapped to HTTP 403 with the code LEGAL_CONSENT_REQUIRED. */
public class LegalConsentRequiredException extends RuntimeException {

    public LegalConsentRequiredException() {
        super("Please accept the latest Terms & Conditions and Privacy Policy to continue.");
    }
}
