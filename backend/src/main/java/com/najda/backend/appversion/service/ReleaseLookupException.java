package com.najda.backend.appversion.service;

/** The release source could not be reached or answered with an error. Never surfaced to clients. */
public class ReleaseLookupException extends RuntimeException {

    public ReleaseLookupException(String message) {
        super(message);
    }

    public ReleaseLookupException(String message, Throwable cause) {
        super(message, cause);
    }
}