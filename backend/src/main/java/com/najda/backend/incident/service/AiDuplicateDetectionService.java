package com.najda.backend.incident.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentMedia;
import com.najda.backend.incident.model.IncidentStatus;
import com.najda.backend.incident.model.MediaType;
import com.najda.backend.incident.repository.IncidentMediaRepository;
import com.najda.backend.incident.repository.IncidentRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AiDuplicateDetectionService {

    private static final Logger log = LoggerFactory.getLogger(AiDuplicateDetectionService.class);
    private static final double CANDIDATE_RADIUS_KM = 2.0;
    private static final int CANDIDATE_WINDOW_MINUTES = 120;
    private static final List<IncidentStatus> OPEN_STATUSES = List.of(
            IncidentStatus.NEW, IncidentStatus.AI_PROCESSED, IncidentStatus.DISPATCHER_REVIEW,
            IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS);

    @Value("${OPENROUTER_API_KEY}")
    private String apiKey;

    @Value("${OPENROUTER_MODEL}")
    private String model;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();
    private final IncidentRepository incidentRepository;
    private final IncidentMediaRepository incidentMediaRepository;
    private final IncidentEventPublisher incidentEventPublisher;

    public AiDuplicateDetectionService(
            IncidentRepository incidentRepository,
            IncidentMediaRepository incidentMediaRepository,
            IncidentEventPublisher incidentEventPublisher) {
        this.incidentRepository = incidentRepository;
        this.incidentMediaRepository = incidentMediaRepository;
        this.incidentEventPublisher = incidentEventPublisher;
    }

    public void checkAsync(Long incidentId) {
        new Thread(() -> {
            try {
                check(incidentId);
            } catch (Exception e) {
                // Same principle as AiPriorityService -- a failed check just
                // means no suggestion shows up; the incident is unaffected.
                log.warn("AI duplicate check failed for incident {}: {}", incidentId, e.getMessage());
            }
        }, "ai-duplicate-" + incidentId).start();
    }

    private void check(Long incidentId) throws Exception {
        Incident incident = incidentRepository.findById(incidentId).orElseThrow();

        LocalDateTime windowStart = incident.getCreatedAt().minusMinutes(CANDIDATE_WINDOW_MINUTES);
        List<Incident> candidates = incidentRepository
                .findByCategoryAndStatusInAndCreatedAtAfter(incident.getCategory(), OPEN_STATUSES, windowStart)
                .stream()
                .filter(c -> !c.getId().equals(incidentId))
                .filter(c -> haversineKm(incident.getLatitude(), incident.getLongitude(), c.getLatitude(), c.getLongitude()) <= CANDIDATE_RADIUS_KM)
                .toList();

        // Nothing nearby, same category, recent -- no API call needed at all.
        if (candidates.isEmpty()) return;

        StringBuilder candidatesBlock = new StringBuilder();
        for (Incident c : candidates) {
            candidatesBlock.append("ID ").append(c.getId()).append(": ").append(textFor(c)).append("\n");
        }

        String prompt = """
                You are checking whether a new emergency incident report is a
                duplicate of an incident already in the system -- i.e. a
                different caller reporting the SAME real-world event, not just
                a similar type of event.

                New report: %s

                Existing open incidents nearby, same category, reported recently:
                %s

                If the new report clearly describes the same real-world event
                as one of the existing incidents, respond with exactly:
                {"duplicateOfId": <id>, "confidence": 0.0-1.0}
                Otherwise, or if you're unsure, respond with:
                {"duplicateOfId": null, "confidence": 0.0}

                Only flag a match when the description strongly suggests the
                same event -- not just the same category and rough area.
                Return ONLY the JSON object, no markdown, no explanation.
                """.formatted(textFor(incident), candidatesBlock);

        String requestBody = mapper.writeValueAsString(Map.of(
                "model", model,
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "temperature", 0.0,
                "max_tokens", 100
        ));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://openrouter.ai/api/v1/chat/completions"))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            log.warn("OpenRouter duplicate-check request failed for incident {}: HTTP {} {}", incidentId, response.statusCode(), response.body());
            return;
        }

        JsonNode root = mapper.readTree(response.body());
        JsonNode contentNode = root.at("/choices/0/message/content");
        if (contentNode.isMissingNode() || contentNode.isNull()) return;

        String cleaned = contentNode.asText().trim()
                .replaceFirst("^```json\\s*", "").replaceFirst("^```\\s*", "").replaceFirst("\\s*```$", "").trim();

        JsonNode parsed;
        try {
            parsed = mapper.readTree(cleaned);
        } catch (Exception e) {
            log.warn("Could not parse AI duplicate-check response for incident {}: {}", incidentId, cleaned);
            return;
        }

        JsonNode idNode = parsed.get("duplicateOfId");
        if (idNode == null || idNode.isNull()) return;

        double confidence = parsed.has("confidence") ? Math.max(0.0, Math.min(1.0, parsed.get("confidence").asDouble())) : 0.0;
        if (confidence < 0.5) return; // below this, not worth surfacing to a dispatcher

        Long duplicateOfId = idNode.asLong();
        Incident suggestedOriginal = incidentRepository.findById(duplicateOfId).orElse(null);
        if (suggestedOriginal == null) return;

        incident.setAiSuggestedDuplicateOf(suggestedOriginal);
        incident.setAiDuplicateConfidence(confidence);
        incidentRepository.save(incident);
        incidentEventPublisher.notifyIncidentsChanged();
    }

    @SuppressWarnings("null")
    private String textFor(Incident incident) {
        return incidentMediaRepository.findByIncidentId(incident.getId()).stream()
                .filter(m -> m.getMediaType() == MediaType.TEXT)
                .findFirst()
                .map(IncidentMedia::getTextContent)
                .orElse("(no message)");
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}