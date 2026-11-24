package com.najda.backend.facility.service;

import com.najda.backend.facility.dto.CreateFacilityRequest;
import com.najda.backend.facility.dto.FacilityResponse;
import com.najda.backend.facility.dto.FacilityTypeChangeImpact;
import com.najda.backend.facility.dto.UpdateFacilityRequest;
import com.najda.backend.facility.model.FacilityType;
import org.springframework.data.domain.Page;
import java.util.List;

public interface FacilityService {
    FacilityResponse create(CreateFacilityRequest request);
    FacilityResponse update(Long facilityId, UpdateFacilityRequest request);

    /** What switching this facility to {@code newType} would do to its linked staff and units. */
    FacilityTypeChangeImpact typeChangeImpact(Long facilityId, FacilityType newType);

    List<FacilityResponse> getAll();
    List<FacilityResponse> getByType(FacilityType type);

    Page<FacilityResponse> search(FacilityType type, String q, org.springframework.data.domain.Pageable pageable);
    
    /**
     * Recomputes {@code registered} from what is linked to the facility right now (active staff or a non-archived
     * unit) and saves it if it changed. Call it after anything that links or unlinks either; a null id is ignored.
     */
    void refreshRegistered(Long facilityId);

    /** The DB doesn't structurally prevent a Unit from pointing at a
        HOSPITAL -- same as every other business rule in this codebase,
        that has to be enforced here, by the caller (unit creation,
        hospital-staff assignment), not by the schema. */
    void requireFacilityOfType(Long facilityId, FacilityType... allowed);

    void backfillMissingAddresses();
}