package com.najda.backend.unit.service;

import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.unit.model.UnitType;
import java.util.Set;

/**
 * What a FACILITY_MANAGER may create, decided by the TYPE of the facility they run -- never by the request.
 * (The client does not get to choose the unit type, the role or the facility; the server fills them in.)
 */
public final class FacilityManagerPolicy {

    private FacilityManagerPolicy() {}

    /** The one kind of unit a facility of this type runs. A hospital runs ambulances. */
    public static UnitType unitTypeFor(FacilityType type) {
        return switch (type) {
            case HOSPITAL, AMBULANCE_STATION -> UnitType.AMBULANCE;
            case FIRE_STATION -> UnitType.FIRE_TRUCK;
            case POLICE_STATION -> UnitType.POLICE_CAR;
        };
    }

    /**
     * The staff accounts a manager may create for their facility. A hospital also employs the ambulance crews of
     * the ambulances it runs, so it may create both hospital staff and ambulance crew.
     */
    public static Set<String> staffRolesFor(FacilityType type) {
        return switch (type) {
            case HOSPITAL -> Set.of("HOSPITAL_STAFF", "AMBULANCE_CREW");
            case AMBULANCE_STATION -> Set.of("AMBULANCE_CREW");
            case FIRE_STATION -> Set.of("FIREFIGHTER");
            case POLICE_STATION -> Set.of("POLICE");
        };
    }
}
