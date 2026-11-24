package com.najda.backend.user.service;

import com.najda.backend.user.dto.AddressRequest;
import com.najda.backend.user.dto.AddressResponse;
import com.najda.backend.user.model.User;

/** One place that decides how a user's address is stored and returned. */
public final class AddressSupport {

    private AddressSupport() {}

    /** Stores the structured address; changes nothing when none was sent. */
    public static void apply(User user, AddressRequest details) {
        if (details == null) return;
        user.setAddressGovernorate(details.governorate());
        user.setAddressCity(details.city().trim());
        user.setAddressStreet(details.street().trim());
        user.setAddressLandmark(blankToNull(details.landmark()));
    }

    public static AddressResponse toResponse(User user) {
        if (user.getAddressGovernorate() == null) return null;
        return new AddressResponse(
                user.getAddressGovernorate(), user.getAddressCity(), user.getAddressStreet(), user.getAddressLandmark());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}