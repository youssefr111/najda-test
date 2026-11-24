package com.najda.backend.facility.dto;

import com.najda.backend.facility.model.FacilityType;

/** {@code convertUnits}: the admin confirmed that units which don't fit a new {@code facilityType} should be relabelled. */
public record UpdateFacilityRequest(String name, String address, Double latitude, Double longitude,
                                    FacilityType facilityType, Boolean convertUnits) {}
