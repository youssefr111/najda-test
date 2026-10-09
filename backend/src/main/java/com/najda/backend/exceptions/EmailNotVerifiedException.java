package com.najda.backend.exceptions;

/** Registration attempted without a valid, unexpired email verification. */
public class EmailNotVerifiedException extends RuntimeException {

    public EmailNotVerifiedException() {
        super("Email address has not been verified. Please verify your email and try again.");
    }
}