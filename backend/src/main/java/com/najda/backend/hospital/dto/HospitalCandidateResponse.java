package com.najda.backend.hospital.dto;

public record HospitalCandidateResponse(
        Long id,
        String name,
        double distanceKm,
        boolean recommended
) {}