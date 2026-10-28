package com.najda.backend.facility.dto;

import com.najda.backend.unit.model.UnitType;
import java.util.List;

/**
 * What changing a facility's type would do to the staff and units linked to it. The admin UI shows it before
 * the change is submitted; the server computes it again, and enforces it, when the change is.
 */
public record FacilityTypeChangeImpact(
        /** Units that don't fit the new type and would be relabelled; empty when every unit still fits. */
        List<UnitConversion> unitConversions,
        /** Linked staff whose role doesn't fit the new type. Never converted automatically: a role carries permissions. */
        int blockingStaff,
        /** Units that would need converting but are on a mission or on shift right now. */
        int blockingUnits,
        boolean blockedByActiveTransfers,
        boolean canProceed
) {
    public record UnitConversion(UnitType from, UnitType to, int count) {}
}
