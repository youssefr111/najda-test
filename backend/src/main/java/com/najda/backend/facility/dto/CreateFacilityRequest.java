package com.najda.backend.facility.dto;

import com.najda.backend.facility.model.FacilityType;

public record CreateFacilityRequest(String name, String address, Double latitude, Double longitude, FacilityType facilityType) {}