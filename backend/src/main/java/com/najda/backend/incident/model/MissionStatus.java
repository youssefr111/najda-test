package com.najda.backend.incident.model;

import java.util.EnumSet;
import java.util.Set;

public enum MissionStatus {
    OFFERED, ACCEPTED, REJECTED, EN_ROUTE, ARRIVED, COMPLETED, CANCELLED;

    /** A unit has accepted and is travelling to, or working at, the incident. */
    public static final Set<MissionStatus> FIELD_ACTIVE = EnumSet.of(ACCEPTED, EN_ROUTE, ARRIVED);
}