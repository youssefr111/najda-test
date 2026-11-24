package com.najda.backend.unit.dto;

/** What deleting a unit would affect, so the person can be warned before confirming. */
public record UnitDeleteImpact(
        String plateNumber,
        int missionCount,
        int activeMissionCount,
        boolean onShift,
        /** "DELETE" (nothing is lost) or "ARCHIVE" (it has history, so it is retired, not erased). */
        String outcome,
        /** True when it cannot be removed right now (mid-mission or people on shift). */
        boolean blocked) {}
