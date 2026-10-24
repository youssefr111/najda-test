package com.najda.backend.incident.service;

import com.najda.backend.exceptions.InvalidLocationException;
import com.najda.backend.geo.EgyptBoundary;
import com.najda.backend.incident.dto.SubmitIncidentRequest;
import com.najda.backend.incident.model.LocationSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Where an incident may be reported from. The one place these rules live. */
@Component
public class IncidentLocationPolicy {

    private static final double EARTH_RADIUS_METERS = 6_371_000;

    private final EgyptBoundary egyptBoundary;
    private final boolean allowManualPin;
    private final int manualPinMaxRadiusMeters;

    public IncidentLocationPolicy(
            EgyptBoundary egyptBoundary,
            @Value("${najda.incident-location.allow-manual-pin:false}") boolean allowManualPin,
            @Value("${najda.incident-location.manual-pin-max-radius-meters:300}") int manualPinMaxRadiusMeters) {
        this.egyptBoundary = egyptBoundary;
        this.allowManualPin = allowManualPin;
        this.manualPinMaxRadiusMeters = manualPinMaxRadiusMeters;
    }

    public boolean allowManualPin() {
        return allowManualPin;
    }

    public int manualPinMaxRadiusMeters() {
        return manualPinMaxRadiusMeters;
    }

    public EgyptBoundary egyptBoundary() {
        return egyptBoundary;
    }

    public void validate(SubmitIncidentRequest request) {
        if (request.locationSource() == null) {
            throw new InvalidLocationException("A location source is required");
        }
        requireInEgypt(request.latitude(), request.longitude(), "The incident location");

        if (request.locationSource() == LocationSource.MANUAL_PIN) {
            if (!allowManualPin) {
                throw new InvalidLocationException("Placing a pin manually is turned off -- please share your live location");
            }
            requireInEgypt(request.deviceLatitude(), request.deviceLongitude(), "Your device location");

            double distance = distanceMeters(
                    request.latitude(), request.longitude(), request.deviceLatitude(), request.deviceLongitude());
            if (distance > manualPinMaxRadiusMeters) {
                throw new InvalidLocationException(
                        "The pin must be within " + manualPinMaxRadiusMeters + " m of your current location");
            }
        }
    }

    @SuppressWarnings("null")
    private void requireInEgypt(Double latitude, Double longitude, String subject) {
        boolean usable = latitude != null && longitude != null
                && Double.isFinite(latitude) && Double.isFinite(longitude)
                && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
        if (!usable) {
            throw new InvalidLocationException(subject + " is missing or invalid");
        }
        if (!egyptBoundary.contains(latitude, longitude)) {
            throw new InvalidLocationException(subject + " is outside Egypt");
        }
    }

    private static double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
    }
}