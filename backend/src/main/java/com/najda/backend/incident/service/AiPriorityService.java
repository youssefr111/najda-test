package com.najda.backend.incident.service;

import com.najda.backend.incident.model.AiPriority;
import com.najda.backend.incident.model.IncidentCategory;
import com.najda.backend.incident.model.IncidentStatus;
import com.najda.backend.incident.repository.IncidentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AiPriorityService {

    private final IncidentEventPublisher incidentEventPublisher;

    public AiPriorityService(IncidentEventPublisher incidentEventPublisher) {
        this.incidentEventPublisher = incidentEventPublisher;
    }

    private static final Logger log = LoggerFactory.getLogger(AiPriorityService.class);

    @Value("${OPENROUTER_API_KEY}")
    private String apiKey;

    @Value("${OPENROUTER_MODEL}")
    private String model;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public void classifyAsync(Long incidentId, IncidentCategory category, String textMessage, IncidentRepository incidentRepository) {
        log.info("AI priority classification starting for incident {}", incidentId);
        new Thread(() -> {
            try {
                classify(incidentId, category, textMessage, incidentRepository);
            } catch (Exception e) {
                // Deliberately swallowed -- a failed AI call must never block or
                // corrupt a real incident. It just stays unscored; a dispatcher
                // reviews it like any incident with no priority set.
                log.warn("AI priority classification failed for incident {}: {}", incidentId, e.getMessage());
            }
        }, "ai-priority-" + incidentId).start();
    }

    private void classify(
            Long incidentId,
            IncidentCategory category,
            String textMessage,
            IncidentRepository incidentRepository
    ) throws Exception {

        String systemPrompt = """
                You are an emergency incident priority classifier.

                Your task is to classify the incident into exactly ONE priority:

                CRITICAL:
                - Immediate threat to life
                - Cardiac arrest or person not breathing
                - Unconscious/unresponsive person
                - Severe uncontrolled bleeding
                - Major fire with people trapped
                - Active violence or immediate danger
                - Any situation requiring immediate emergency response

                HIGH:
                - Serious injury or illness
                - Difficulty breathing
                - Chest pain
                - Significant bleeding
                - Serious accident
                - Situation that could rapidly become life-threatening

                MEDIUM:
                - Non-life-threatening injury
                - Minor accident
                - Moderate medical issue
                - Property damage requiring response
                - Situation requiring response but without immediate danger to life

                LOW:
                - No immediate danger to life
                - Minor property issue
                - General request or information
                - Situation that can safely wait

                Important:
                - Treat the reporter's description as the primary evidence.
                - Do not invent facts that are not present.
                - When uncertain between two priorities, choose the more urgent one.
                - This is a recommendation only. A human dispatcher makes the final decision.

                Return ONLY a JSON object:
                {"priority":"CRITICAL|HIGH|MEDIUM|LOW","confidence":0.0}

                Do not use markdown.
                Do not include explanations.
                Do not include code fences.
                """;

        String userPrompt = """
                Incident category: %s

                Reporter message:
                %s
                """.formatted(
                category,
                textMessage == null || textMessage.isBlank()
                        ? "(no message provided)"
                        : textMessage
        );

        String requestBody = mapper.writeValueAsString(Map.of(
                "model", model,
                "messages", List.of(
                        Map.of(
                                "role", "system",
                                "content", systemPrompt
                        ),
                        Map.of(
                                "role", "user",
                                "content", userPrompt
                        )
                ),
                "temperature", 0.0,
                "max_tokens", 300,
                "response_format", Map.of(
                        "type", "json_object"
                )
        ));


        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://openrouter.ai/api/v1/chat/completions"))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IllegalStateException(
                    "OpenRouter request failed: HTTP "
                            + response.statusCode()
                            + " "
                            + response.body()
            );
        }

        JsonNode root = mapper.readTree(response.body());

        JsonNode contentNode = root.at("/choices/0/message/content");

        if (contentNode.isMissingNode() || contentNode.isNull()) {
            log.warn(
                    "OpenRouter returned no message content for incident {}: {}",
                    incidentId,
                    response.body()
            );
            return;
        }

        JsonNode choiceNode = root.at("/choices/0");

        JsonNode finishReasonNode = choiceNode.get("finish_reason");

        if (finishReasonNode != null) {
            log.debug(
                    "AI finish reason for incident {}: {}",
                    incidentId,
                    finishReasonNode.asText()
            );
        }

        String content = contentNode.asText();

        log.debug(
                "AI raw classification for incident {}: {}",
                incidentId,
                content
        );

        JsonNode parsed = extractJsonObject(content);

        if (parsed == null) {
            log.warn(
                    "Could not parse AI classification for incident {}: {}",
                    incidentId,
                    content
            );
            return;
        }

        JsonNode priorityNode = parsed.get("priority");

        if (priorityNode == null || priorityNode.isNull()) {
            log.warn(
                    "AI classification missing priority for incident {}: {}",
                    incidentId,
                    content
            );
            return;
        }

        AiPriority priority;

        try {
            priority = AiPriority.valueOf(
                    priorityNode.asText().trim().toUpperCase()
            );
        } catch (IllegalArgumentException e) {
            log.warn(
                    "AI returned invalid priority for incident {}: {}",
                    incidentId,
                    priorityNode.asText()
            );
            return;
        }

        double confidence = 0.5;

        JsonNode confidenceNode = parsed.get("confidence");

        if (confidenceNode != null && confidenceNode.isNumber()) {
            confidence = Math.max(
                    0.0,
                    Math.min(1.0, confidenceNode.asDouble())
            );
        }

        AiPriority finalPriority = priority;
        double finalConfidence = confidence;

        incidentRepository.findById(incidentId).ifPresent(incident -> {

            incident.setAiPriority(finalPriority);
            incident.setAiConfidence(finalConfidence);

            if (incident.getStatus() == IncidentStatus.NEW) {
                incident.setStatus(IncidentStatus.AI_PROCESSED);
            }

            incidentRepository.save(incident);

            log.info(
                    "AI priority classification succeeded for incident {}: priority={}, confidence={}",
                    incidentId,
                    finalPriority,
                    finalConfidence
            );

            incidentEventPublisher.notifyIncidentsChanged();
        });
    }
    private JsonNode extractJsonObject(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }

        String cleaned = content.trim();

        // Remove markdown fences if the model ignored the instruction.
        cleaned = cleaned
                .replaceFirst("^```json\\s*", "")
                .replaceFirst("^```\\s*", "")
                .replaceFirst("\\s*```$", "")
                .trim();

        // First attempt: entire response is JSON.
        try {
            JsonNode node = mapper.readTree(cleaned);

            if (node != null && node.isObject()) {
                return node;
            }
        } catch (Exception ignored) {
            // Try extracting the JSON object below.
        }

        // Second attempt: find the first JSON object in the response.
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');

        if (start >= 0 && end > start) {
            String candidate = cleaned.substring(start, end + 1);

            try {
                JsonNode node = mapper.readTree(candidate);

                if (node != null && node.isObject()) {
                    return node;
                }
            } catch (Exception ignored) {
                // Invalid JSON.
            }
        }

        return null;
    }
}