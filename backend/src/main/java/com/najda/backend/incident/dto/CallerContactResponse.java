package com.najda.backend.incident.dto;

/**
 * How a dispatcher can reach an incident's caller.
 *
 * @param phone         the caller's phone number, only when it is verified; null otherwise (an unverified number
 *                      never leaves the server).
 * @param phoneVerified whether {@code phone} was verified. Always true when {@code phone} is present.
 */
public record CallerContactResponse(String phone, boolean phoneVerified) {}