package com.najda.backend.legal.web;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Put on a controller method that must only be used by someone who has accepted the latest Terms and
 * Privacy Policy. Everyone else gets 403 with the code {@code LEGAL_CONSENT_REQUIRED}.
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresLegalConsent {
}
