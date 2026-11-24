package com.najda.backend.legal.web;

import com.najda.backend.exceptions.ApiError;
import com.najda.backend.exceptions.ResponseEntityBuilder;
import com.najda.backend.legal.service.LegalConsentRequiredException;
import java.time.Instant;
import java.util.List;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 403 with the machine-readable code LEGAL_CONSENT_REQUIRED in `errors`, so a client can show the acceptance prompt. */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LegalConsentExceptionHandler {

    @ExceptionHandler(LegalConsentRequiredException.class)
    public ResponseEntity<Object> handle(LegalConsentRequiredException ex) {
        ApiError apiError = ApiError.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.FORBIDDEN.value())
                .message(ex.getMessage())
                .errors(List.of("LEGAL_CONSENT_REQUIRED"))
                .build();
        return ResponseEntityBuilder.build(apiError);
    }
}
