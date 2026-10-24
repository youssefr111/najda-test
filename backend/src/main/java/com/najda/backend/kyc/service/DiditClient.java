package com.najda.backend.kyc.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.exceptions.KycProviderException;
import com.najda.backend.kyc.config.KycProperties;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** The two Didit v3 calls we make: create a hosted verification session, and read a session's decision. */
@Component
public class DiditClient {

    public record Session(String sessionId, String url) {}

    /** What we read from a decision: never any personal data, only the outcome and a generic reason. */
    /** One row of Didit's session list: only what we need to find a session, no personal data. */
    public record SessionRef(String sessionId, String status, String vendorData) {}

    public record Decision(String status, String vendorData, String firstWarning) {}

    private final KycProperties.Didit config;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public DiditClient(KycProperties properties, ObjectMapper mapper) {
        this.config = properties.didit();
        this.mapper = mapper;
    }

    public boolean configured() {
        return config.configured();
    }

    /** {@code vendorData} is OUR user id: it comes back on every webhook and links the session to the account. */
    public Session createSession(String vendorData, String callbackUrl) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("workflow_id", config.workflowId());
        body.put("vendor_data", vendorData);
        if (callbackUrl != null && !callbackUrl.isBlank()) body.put("callback", callbackUrl);

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(base() + "/v3/session/"))
                    .timeout(Duration.ofSeconds(15))
                    .header("x-api-key", config.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new KycProviderException("Didit refused to create a session (HTTP " + response.statusCode() + ")");
            }
            JsonNode json = mapper.readTree(response.body());
            String sessionId = json.path("session_id").asText("");
            String url = json.path("url").asText("");
            if (sessionId.isBlank() || url.isBlank()) {
                throw new KycProviderException("Didit's answer had no session id or url");
            }
            return new Session(sessionId, url);
        } catch (IOException e) {
            throw new KycProviderException("Could not reach Didit", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new KycProviderException("Interrupted while contacting Didit", e);
        }
    }

    /** The authoritative result of a session. Used to confirm an approval before we trust a webhook. */
    public Decision fetchDecision(String sessionId) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(base() + "/v3/session/" + sessionId + "/decision/"))
                    .timeout(Duration.ofSeconds(15))
                    .header("x-api-key", config.apiKey())
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new KycProviderException("Didit could not return the decision (HTTP " + response.statusCode() + ")");
            }
            JsonNode json = mapper.readTree(response.body());
            return new Decision(json.path("status").asText(""), json.path("vendor_data").asText(""), firstWarning(json));
        } catch (IOException e) {
            throw new KycProviderException("Could not reach Didit", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new KycProviderException("Interrupted while contacting Didit", e);
        }
    }

    /**
     * Deletes a session from Didit: its decision, documents, selfie and face data. Used when an admin resets someone,
     * so that the person (or a test run with the same ID) can verify again without being flagged as a duplicate.
     * {@code retain_face_embeddings: false} makes sure the face data goes too, even if the application was ever set to
     * keep face templates. A 404 means it is already gone, which is the outcome we wanted. Needs the API key's
     * {@code delete:sessions} permission (the primary key has it).
     */
    public void deleteSession(String sessionId) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(base() + "/v3/session/" + sessionId + "/delete/"))
                    .timeout(Duration.ofSeconds(20))
                    .header("x-api-key", config.apiKey())
                    .header("Content-Type", "application/json")
                    .method("DELETE", HttpRequest.BodyPublishers.ofString("{\"retain_face_embeddings\":false}"))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 404) return;
            if (status / 100 != 2) {
                throw new KycProviderException("Didit could not delete the session (HTTP " + status + ")");
            }
        } catch (IOException e) {
            throw new KycProviderException("Could not reach Didit", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new KycProviderException("Interrupted while contacting Didit", e);
        }
    }

    /**
     * Didit's sessions for one person (our {@code vendor_data}), newest first. Needs the API key's
     * {@code read:sessions} permission (the primary key has it). Used only for recovery and for resets, never polled.
     */
    public List<SessionRef> listSessions(String vendorData, String status, int limit) {
        String query = "vendor_data=" + enc(vendorData) + (status == null ? "" : "&status=" + enc(status)) + "&limit=" + limit;
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(base() + "/v3/sessions/?" + query))
                    .timeout(Duration.ofSeconds(15))
                    .header("x-api-key", config.apiKey())
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new KycProviderException("Didit could not list sessions (HTTP " + response.statusCode() + ")");
            }
            List<SessionRef> out = new ArrayList<>();
            for (JsonNode row : mapper.readTree(response.body()).path("results")) {
                String id = row.path("session_id").asText("");
                if (!id.isBlank()) out.add(new SessionRef(id, row.path("status").asText(""), row.path("vendor_data").asText("")));
            }
            return out;
        } catch (IOException e) {
            throw new KycProviderException("Could not reach Didit", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new KycProviderException("Interrupted while contacting Didit", e);
        }
    }

    /** This person's newest approved session, if Didit has one (whatever session id we have stored for them). */
    @SuppressWarnings("null")
    public Optional<String> findApprovedSessionId(String vendorData) {
        return listSessions(vendorData, "Approved", 5).stream()
                .filter(ref -> "Approved".equalsIgnoreCase(ref.status()) && vendorData.equals(ref.vendorData()))
                .map(SessionRef::sessionId)
                .findFirst();
    }

    /** Deletes every session Didit holds for this person. Returns how many were deleted. */
    public int deleteAllSessions(String vendorData) {
        int deleted = 0;
        for (int round = 0; round < 5; round++) { // a few rounds, in case there are more than one page of them
            List<SessionRef> sessions = listSessions(vendorData, null, 100);
            if (sessions.isEmpty()) break;
            for (SessionRef ref : sessions) {
                if (vendorData.equals(ref.vendorData())) {
                    deleteSession(ref.sessionId());
                    deleted++;
                }
            }
        }
        return deleted;
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /** The first generic warning ("Document expired", "Low face match similarity"...), from any check. */
    static String firstWarning(JsonNode decision) {
        for (String group : new String[] {"id_verifications", "liveness_checks", "face_matches"}) {
            for (JsonNode item : decision.path(group)) {
                for (JsonNode warning : item.path("warnings")) {
                    String text = warning.path("short_description").asText("");
                    if (!text.isBlank()) return text;
                }
            }
        }
        return null;
    }

    private String base() {
        String base = config.baseUrl();
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }
}
