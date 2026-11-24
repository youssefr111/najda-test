package com.najda.backend.legal.service;

import java.util.List;

/** The submitted legal document is incomplete or malformed. Carries every problem found. */
public class LegalValidationException extends RuntimeException {

    public LegalValidationException(List<String> problems) {
        super(String.join(" • ", problems));
    }
}
