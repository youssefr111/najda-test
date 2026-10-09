package com.najda.backend.exceptions;

import com.najda.backend.mail.EmailDeliveryException;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.dao.OptimisticLockingFailureException;

@Slf4j
@ControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    // ---------- domain / application exceptions ----------

    @ExceptionHandler(ResourceNotFoundException.class)
    protected ResponseEntity<Object> handleResourceNotFound(ResourceNotFoundException ex) {
        return respond(HttpStatus.NOT_FOUND, "Resource not found.", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    protected ResponseEntity<Object> handleIllegalArgument(IllegalArgumentException ex) {
        return respond(HttpStatus.BAD_REQUEST, "Validation failed.", ex.getMessage());
    }

    // ---------- email OTP registration ----------

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    protected ResponseEntity<Object> handleEmailAlreadyRegistered(EmailAlreadyRegisteredException ex) {
        return respond(HttpStatus.CONFLICT, "Email already registered.", ex.getMessage());
    }

    /** 422 (not 409) so clients can tell "phone taken" apart from "email taken". */
    @ExceptionHandler(PhoneAlreadyInUseException.class)
    protected ResponseEntity<Object> handlePhoneAlreadyInUse(PhoneAlreadyInUseException ex) {
        return respond(HttpStatus.valueOf(422), "Phone number unavailable.", ex.getMessage());
    }

    @ExceptionHandler(InvalidVerificationCodeException.class)
    protected ResponseEntity<Object> handleInvalidVerificationCode(InvalidVerificationCodeException ex) {
        return respond(HttpStatus.BAD_REQUEST, "Invalid verification code.", ex.getMessage());
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    protected ResponseEntity<Object> handleEmailNotVerified(EmailNotVerifiedException ex) {
        return respond(HttpStatus.FORBIDDEN, "Email not verified.", ex.getMessage());
    }

    @ExceptionHandler(TooManyRequestsException.class)
    protected ResponseEntity<Object> handleTooManyRequests(TooManyRequestsException ex) {
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS);
        Duration retryAfter = ex.getRetryAfter();
        if (retryAfter != null) {
            long seconds = Math.max(1, retryAfter.plusMillis(999).toSeconds());
            response.header(HttpHeaders.RETRY_AFTER, String.valueOf(seconds));
        }
        return response.body(apiError(HttpStatus.TOO_MANY_REQUESTS, "Too many requests.", ex.getMessage()));
    }

    @ExceptionHandler(EmailDeliveryException.class)
    protected ResponseEntity<Object> handleEmailDelivery(EmailDeliveryException ex) {
        log.error("Email delivery failed", ex);
        return respond(HttpStatus.SERVICE_UNAVAILABLE, "Email service unavailable.",
                "We couldn't send the email right now. Please try again shortly.");
    }

    // ---------- security ----------

    @ExceptionHandler(BadCredentialsException.class)
    protected ResponseEntity<Object> handleBadCredentials(BadCredentialsException ex) {
        return respond(HttpStatus.UNAUTHORIZED, "Invalid credentials.", ex.getMessage());
    }

    @ExceptionHandler(DisabledException.class)
    protected ResponseEntity<Object> handleDisabled(DisabledException ex) {
        return respond(HttpStatus.UNAUTHORIZED, "User account disabled.", "The user account is disabled.");
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    protected ResponseEntity<Object> handleOptimisticLockingFailure(OptimisticLockingFailureException ex) {
        ApiError apiError = ApiError.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.CONFLICT.value())
                .message("This record was just updated by someone else -- refresh and try again.")
                .errors(List.of("Concurrent update detected"))
                .build();
        return ResponseEntityBuilder.build(apiError);
    }

    // ---------- catch-all ----------

    @ExceptionHandler(Exception.class)
    protected ResponseEntity<Object> handleAll(Exception ex, WebRequest request) {
        log.error("Unhandled exception", ex);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.", ex.getMessage());
    }

    // ---------- Spring MVC overrides ----------

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return respond(HttpStatus.BAD_REQUEST, "Malformed JSON found.", ex.getMessage());
    }

    @Override
    protected ResponseEntity<Object> handleHttpMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return respond(HttpStatus.BAD_REQUEST, "Unsupported Media Type.", ex.getMessage());
    }

    @Override
    protected ResponseEntity<Object> handleNoHandlerFoundException(NoHandlerFoundException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return respond(HttpStatus.NOT_FOUND, "Method not supported.", ex.getMessage());
    }

    @Override
    protected ResponseEntity<Object> handleHttpRequestMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return respond(HttpStatus.NOT_FOUND, "Method not supported.", ex.getMessage());
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<String> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> ((FieldError) error).getField() + " : " + error.getDefaultMessage())
                .collect(Collectors.toList());
        return ResponseEntityBuilder.build(apiError(HttpStatus.BAD_REQUEST, "Validation Errors.", details));
    }

    // ---------- helpers ----------

    private static ResponseEntity<Object> respond(HttpStatus status, String message, String... details) {
        return ResponseEntityBuilder.build(apiError(status, message, details));
    }

    private static ApiError apiError(HttpStatus status, String message, String... details) {
        // Arrays.asList (not List.of) because a detail may legitimately be null
        // (e.g. an NPE's getMessage()).
        return apiError(status, message, Arrays.asList(details));
    }

    private static ApiError apiError(HttpStatus status, String message, List<String> details) {
        return ApiError.builder()
                .timestamp(Instant.now())
                .status(status.value())
                .message(message)
                .errors(details)
                .build();
    }
}