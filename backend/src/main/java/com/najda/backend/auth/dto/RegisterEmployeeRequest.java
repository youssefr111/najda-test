package com.najda.backend.auth.dto;

import com.najda.backend.user.model.Gender;

public record RegisterEmployeeRequest(
        String firstName,
        String lastName,
        String email,
        String phone,
        String address,
        Gender gender,
        String roleName,
        Long facilityId
) {}