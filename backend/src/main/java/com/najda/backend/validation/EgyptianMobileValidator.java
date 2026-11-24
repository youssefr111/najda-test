package com.najda.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class EgyptianMobileValidator implements ConstraintValidator<EgyptianMobile, String> {

    private static final Pattern EGYPTIAN_MOBILE = Pattern.compile("^\\+201[0125]\\d{8}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || EGYPTIAN_MOBILE.matcher(value).matches();
    }
}