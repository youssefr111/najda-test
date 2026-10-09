package com.najda.backend.facility.dto;

public record HospitalCandidateResponse(
        Long id,
        String name,
        double distanceKm,
        boolean recommended
) {}