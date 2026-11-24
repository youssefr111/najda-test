package com.najda.backend.unit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.unit.service.FacilityManagerPolicy;
import com.najda.backend.unit.service.RoleFacilityPolicy;
import java.util.Set;
import org.junit.jupiter.api.Test;

class FacilityManagerPolicyTest {

    @Test
    void theFacilityTypeFixesTheUnitType() {
        assertEquals(UnitType.AMBULANCE, FacilityManagerPolicy.unitTypeFor(FacilityType.HOSPITAL));
        assertEquals(UnitType.AMBULANCE, FacilityManagerPolicy.unitTypeFor(FacilityType.AMBULANCE_STATION));
        assertEquals(UnitType.FIRE_TRUCK, FacilityManagerPolicy.unitTypeFor(FacilityType.FIRE_STATION));
        assertEquals(UnitType.POLICE_CAR, FacilityManagerPolicy.unitTypeFor(FacilityType.POLICE_STATION));
    }

    @Test
    void aHospitalMayHaveHospitalStaffAndAmbulanceCrewsButNothingElse() {
        assertEquals(Set.of("HOSPITAL_STAFF", "AMBULANCE_CREW"), FacilityManagerPolicy.staffRolesFor(FacilityType.HOSPITAL));
        assertFalse(FacilityManagerPolicy.staffRolesFor(FacilityType.HOSPITAL).contains("FACILITY_MANAGER"));
        assertFalse(FacilityManagerPolicy.staffRolesFor(FacilityType.HOSPITAL).contains("ADMIN"));
    }

    @Test
    void otherFacilitiesMayOnlyHaveTheirOwnKindOfStaff() {
        assertEquals(Set.of("AMBULANCE_CREW"), FacilityManagerPolicy.staffRolesFor(FacilityType.AMBULANCE_STATION));
        assertEquals(Set.of("FIREFIGHTER"), FacilityManagerPolicy.staffRolesFor(FacilityType.FIRE_STATION));
        assertEquals(Set.of("POLICE"), FacilityManagerPolicy.staffRolesFor(FacilityType.POLICE_STATION));
    }

    @Test
    void everyRoleAManagerMayCreateIsValidForTheFacilityItIsCreatedAt() {
        // The manager's policy and the platform's role/facility policy must never disagree.
        for (FacilityType type : FacilityType.values()) {
            for (String role : FacilityManagerPolicy.staffRolesFor(type)) {
                assertTrue(RoleFacilityPolicy.expectedTypes(role).contains(type), role + " at " + type);
            }
        }
    }

    @Test
    void aManagerRoleIsLinkedToAFacilityOfAnyType() {
        assertTrue(RoleFacilityPolicy.requiresFacility("FACILITY_MANAGER"));
        for (FacilityType type : FacilityType.values()) {
            assertTrue(RoleFacilityPolicy.expectedTypes("FACILITY_MANAGER").contains(type));
        }
    }
}
