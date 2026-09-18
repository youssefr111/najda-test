package com.najda.backend.facility.dto;

import com.najda.backend.facility.model.FacilityType;

public record FacilityResponse(
        Long id, String name, String address, Double latitude, Double longitude,
        FacilityType facilityType, boolean registered
) {}