package com.najda.backend.incident.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.incident.repository.IncidentRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ReverseGeocodingService {

    private static final Logger log = LoggerFactory.getLogger(ReverseGeocodingService.class);

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public void resolveAsync(Long incidentId, double latitude, double longitude, IncidentRepository incidentRepository) {
        new Thread(() -> {
            try {
                reverseGeocode(latitude, longitude).ifPresent(address ->
                        incidentRepository.findById(incidentId).ifPresent(incident -> {
                            incident.setAddress(address);
                            incidentRepository.save(incident);
                        }));
            } catch (Exception e) {
                log.warn("Reverse geocoding failed for incident {}: {}", incidentId, e.getMessage());
            }
        }, "reverse-geocode-" + incidentId).start();
    }
    
    public static class RateLimitedException extends RuntimeException {}

    public Optional<String> reverseGeocode(double latitude, double longitude) throws Exception {
        String url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + latitude + "&lon=" + longitude;

        for (int attempt = 1; attempt <= 3; attempt++) {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("User-Agent", "NAJDA-dispatch-simulation")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 429) {
                // Rate limited -- never worth retrying immediately, and the
                // caller (a batch loop) needs to know to stop entirely rather
                // than grind through the rest of a large facility list at the
                // same limited rate, hitting this on every remaining item.
                throw new RateLimitedException();
            }
            if (response.statusCode() == 503 && attempt < 3) {
                log.warn("Nominatim overloaded (HTTP 503), retrying (attempt {}/3)", attempt);
                Thread.sleep(1500L * attempt);
                continue;
            }
            if (response.statusCode() != 200) {
                log.warn("Nominatim reverse geocode failed: HTTP {}", response.statusCode());
                return Optional.empty();
            }

            JsonNode body = mapper.readTree(response.body());
            JsonNode displayName = body.get("display_name");
            if (displayName == null || displayName.isNull()) {
                return Optional.empty();
            }
            return Optional.of(displayName.asText());
        }

        return Optional.empty();
    }
}