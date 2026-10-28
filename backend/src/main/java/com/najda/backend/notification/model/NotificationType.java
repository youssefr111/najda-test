package com.najda.backend.notification.model;

/**
 * Every kind of notification the system sends. Whether it is "urgent" decides
 * the push priority and the Android channel (sound + heads-up) it uses.
 */
public enum NotificationType {
    // --- dispatch / admin ---
    INCIDENT_NEW(true),
    INCIDENT_CANCELLED_BY_CITIZEN(false),
    MISSION_REJECTED(true),
    MISSION_WITHDRAWN(false),
    APPLICATION_SUBMITTED(false),

    // --- responders ---
    MISSION_OFFERED(true),
    MISSION_CANCELLED(false),

    // --- hospital ---
    PATIENT_INCOMING(true),

    // --- citizen ---
    LEGAL_UPDATED(false),
    INCIDENT_ACCEPTED(false),
    INCIDENT_EN_ROUTE(false),
    INCIDENT_ARRIVED(false),
    INCIDENT_RESOLVED(false),
    INCIDENT_CLOSED_FALSE_REPORT(false),
    INCIDENT_CLOSED_DUPLICATE(false),
    APPLICATION_APPROVED(false),
    APPLICATION_REJECTED(false),

    // --- everyone in a response ---
    CHAT_MESSAGE(false);

    private final boolean urgent;

    NotificationType(boolean urgent) {
        this.urgent = urgent;
    }

    public boolean isUrgent() {
        return urgent;
    }
}
