package com.najda.backend.incident.dto;

/** Exactly one of hospitalId or destinationNameFreetext should be provided --
    validated in HospitalTransferServiceImpl.selectHospital. */
public record SelectHospitalRequest(Long missionId, Long hospitalId, String destinationNameFreetext) {}