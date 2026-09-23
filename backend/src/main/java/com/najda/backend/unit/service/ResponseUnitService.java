package com.najda.backend.unit.service;

import com.najda.backend.unit.dto.CreateResponseUnitRequest;
import com.najda.backend.unit.dto.ResponseUnitResponse;
import com.najda.backend.unit.dto.UpdateResponseUnitRequest;

import java.util.List;

public interface ResponseUnitService {
    ResponseUnitResponse create(CreateResponseUnitRequest request);
    List<ResponseUnitResponse> getAll();
    List<ResponseUnitResponse> getUnitsForFacility(Long facilityId, String roleName, Long callerId);
    ResponseUnitResponse update(Long unitId, UpdateResponseUnitRequest request);
    ResponseUnitResponse updateLocation(Long callerId, Long unitId, Double latitude, Double longitude);
    void reconcileStatuses();
    void delete(Long unitId);
}