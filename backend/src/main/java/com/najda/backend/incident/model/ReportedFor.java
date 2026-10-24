package com.najda.backend.incident.model;

/**
 * Who an emergency is about. The reporter's medical profile describes the REPORTER, so it may only ever be
 * shown to responders when the reporter is the patient ({@link #SELF}); for {@link #OTHER} it is never used,
 * and responders and dispatch see a clear "reported for someone else" notice instead.
 */
public enum ReportedFor {
    SELF,
    OTHER
}
