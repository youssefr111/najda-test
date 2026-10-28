package com.najda.backend.user.dto;

import com.najda.backend.user.model.Governorate;

/** The structured parts of a user's address. */
public record AddressResponse(Governorate governorate, String city, String street, String landmark) {}
