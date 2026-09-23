package com.najda.backend.unit.dto;
import com.najda.backend.unit.model.UnitType;

public record UpdateResponseUnitRequest(String plateNumber, UnitType unitType, Long facilityId) {}