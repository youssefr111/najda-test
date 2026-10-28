package com.najda.backend.exceptions;

/** Registration email already exists. Mapped to HTTP 409. Separate from ConflictException on purpose. */
public class EmailAlreadyRegisteredException extends RuntimeException {

    public EmailAlreadyRegisteredException() {
        super("This email is already registered.");
    }
}