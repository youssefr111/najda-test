package com.najda.backend.facility.service;

import com.najda.backend.facility.dto.CreateFacilityRequest;
import com.najda.backend.facility.dto.FacilityResponse;
import com.najda.backend.facility.dto.UpdateFacilityRequest;
import com.najda.backend.facility.model.FacilityType;
import java.util.List;

public interface FacilityService {
    FacilityResponse create(CreateFacilityRequest request);
    FacilityResponse update(Long facilityId, UpdateFacilityRequest request);
    List<FacilityResponse> getAll();
    List<FacilityResponse> getByType(FacilityType type);
    
    void markRegistered(Long facilityId);

    /** The DB doesn't structurally prevent a Unit from pointing at a
        HOSPITAL -- same as every other business rule in this codebase,
        that has to be enforced here, by the caller (unit creation,
        hospital-staff assignment), not by the schema. */
    void requireFacilityOfType(Long facilityId, FacilityType... allowed);

    void backfillMissingAddresses();
}