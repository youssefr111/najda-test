package com.najda.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * An Egyptian mobile number in E.164 form, e.g. +201012345678 -- the same
 * rule the web app enforces in PhoneField. A null value is considered valid;
 * combine with {@code @NotBlank} where the number is required.
 */
@Documented
@Constraint(validatedBy = EgyptianMobileValidator.class)
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface EgyptianMobile {

    String message() default "must be an Egyptian mobile number in E.164 format, e.g. +201012345678";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}