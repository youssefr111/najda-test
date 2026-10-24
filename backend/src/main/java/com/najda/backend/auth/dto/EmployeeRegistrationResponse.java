package com.najda.backend.auth.dto;

import com.najda.backend.user.dto.UserResponse;

/**
 * passwordResetLink is a placeholder until real email delivery is wired up:
 * for now, whoever calls this endpoint (an Admin) is responsible for
 * getting this link to the new employee manually. Replace with an actual
 * email-send call once you have that infrastructure -- don't return this
 * link in the API response once real email delivery exists, since it's
 * effectively a credential.
 */
public record EmployeeRegistrationResponse(
        UserResponse user,
        String passwordResetLink
) {
}