package com.najda.backend.legal.model;

/** Where an acceptance was recorded. */
public enum ConsentSource {
    WEB,
    MOBILE,
    /** Accounts created by the system itself (the seeded staff accounts); never sent by a client. */
    SYSTEM
}
