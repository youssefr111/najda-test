package com.najda.backend.facility.seed;

import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;

/** One validated line of {@code content/facilities.csv}. */
record FacilitySeedRow(String name, String address, FacilityType type, double latitude, double longitude) {

    /**
     * A new, unsaved facility. {@code registered} is derived state (it flips when staff or a unit gets
     * linked), so a seed never sets it, whatever the file says.
     */
    Facility toFacility() {
        Facility facility = new Facility();
        facility.setName(name);
        facility.setAddress(address);
        facility.setFacilityType(type);
        facility.setLatitude(latitude);
        facility.setLongitude(longitude);
        facility.setRegistered(false);
        return facility;
    }
}
