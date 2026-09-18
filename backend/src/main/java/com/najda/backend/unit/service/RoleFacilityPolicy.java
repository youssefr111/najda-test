package com.najda.backend.unit.service;

import com.najda.backend.facility.model.FacilityType;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/** Which roles can be linked to a Facility, and which FacilityType each
    expects. Centralized so registerEmployee and updateFacility -- the two
    places that assign this link -- can't drift apart on the mapping. */
public final class RoleFacilityPolicy {

    private static final Map<String, Set<FacilityType>> ROLE_FACILITY_TYPES = Map.of(
            "HOSPITAL_STAFF", EnumSet.of(FacilityType.HOSPITAL),
            "AMBULANCE_CREW", EnumSet.of(FacilityType.AMBULANCE_STATION, FacilityType.HOSPITAL),
            "POLICE", EnumSet.of(FacilityType.POLICE_STATION),
            "FIREFIGHTER", EnumSet.of(FacilityType.FIRE_STATION)
    );


    // Roles whose facility link is required at creation/update.
    // Other roles may still be linked to a facility, but the link is optional.
    private static final Set<String> REQUIRED_FOR = Set.of(
            "HOSPITAL_STAFF",
            "AMBULANCE_CREW",
            "POLICE",
            "FIREFIGHTER"
    );  

    private RoleFacilityPolicy() {}

    public static boolean allowsFacility(String roleName) {
        return ROLE_FACILITY_TYPES.containsKey(roleName.toUpperCase());
    }

    public static boolean requiresFacility(String roleName) {
        return REQUIRED_FOR.contains(roleName.toUpperCase());
    }

    public static Set<FacilityType> expectedTypes(String roleName) {
        Set<FacilityType> types = ROLE_FACILITY_TYPES.get(roleName.toUpperCase());
        if (types == null) throw new IllegalArgumentException(roleName + " cannot be linked to a facility");
        return types;
    }
}