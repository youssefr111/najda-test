package com.najda.backend.auth.dto;

import com.najda.backend.user.dto.AddressRequest;
import com.najda.backend.user.model.Gender;
import jakarta.validation.Valid;
import com.najda.backend.validation.EgyptianMobile;

public record RegisterEmployeeRequest(
        String firstName,
        String lastName,
        String email,
        @EgyptianMobile String phone,
        Gender gender,
        String roleName,
        Long facilityId,
        @Valid AddressRequest addressDetails
) {}