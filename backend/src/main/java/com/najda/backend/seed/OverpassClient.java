package com.najda.backend.seed;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Shared Overpass-with-mirror-fallback fetch, used by every OSM-backed seeder. */
@Component
public class OverpassClient {

    private static final Logger log = LoggerFactory.getLogger(OverpassClient.class);

    private static final List<String> MIRRORS = List.of(
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter"
    );

    public record MirrorResponse(String mirrorUsed, String body) {}

    public MirrorResponse fetch(String query) throws Exception {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
        List<String> failures = new ArrayList<>();

        for (String mirror : MIRRORS) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(mirror))
                        .timeout(Duration.ofSeconds(200))
                        .POST(HttpRequest.BodyPublishers.ofString("data=" + URLEncoder.encode(query, StandardCharsets.UTF_8)))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    log.info("Overpass mirror succeeded: {}", mirror);
                    return new MirrorResponse(mirror, response.body());
                }
                log.warn("Overpass mirror {} returned HTTP {}, trying next mirror", mirror, response.statusCode());
                failures.add(mirror + " -> HTTP " + response.statusCode());
            } catch (Exception e) {
                log.warn("Overpass mirror {} failed: {}, trying next mirror", mirror, e.getMessage());
                failures.add(mirror + " -> " + e.getMessage());
            }
        }

        throw new IllegalStateException("All Overpass mirrors failed. Attempts: " + String.join(" | ", failures));
    }
}