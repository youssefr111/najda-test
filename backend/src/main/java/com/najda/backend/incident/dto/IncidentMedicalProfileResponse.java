package com.najda.backend.incident.dto;

import com.najda.backend.user.dto.MedicalProfileResponse;

/**
 * What a permitted viewer gets for an incident. {@code shared == false} means the
 * patient hasn't allowed (or has since withdrawn) sharing; {@code profile} is then null.
 */
public record IncidentMedicalProfileResponse(boolean shared, MedicalProfileResponse profile) {
}