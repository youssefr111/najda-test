package com.najda.backend.ai.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The one place that talks to OpenRouter's chat-completions API.
 *
 * - {@link #completeJson}: text-in, JSON-out, using the configured OPENROUTER_MODEL (priority + duplicates).
 * - {@link #chat}: any model, multimodal content parts (audio / images), plain-text answer (media understanding).
 */
@Component
public class OpenRouterClient {

    private static final Logger log = LoggerFactory.getLogger(OpenRouterClient.class);
    private static final URI ENDPOINT = URI.create("https://openrouter.ai/api/v1/chat/completions");

    private final String apiKey;
    private final String model;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper = new ObjectMapper();

    public OpenRouterClient(@Value("${OPENROUTER_API_KEY}") String apiKey,
                            @Value("${OPENROUTER_MODEL}") String model) {
        this.apiKey = apiKey;
        this.model = model;
    }

    /**
     * Sends a system + user prompt at temperature 0 and returns the JSON object the model answered with.
     * Empty when the model returned nothing parseable; throws on transport errors and non-200 replies so the
     * caller can log them against the right incident.
     */
    public Optional<JsonNode> completeJson(String system, String user, int maxTokens) throws Exception {
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", user)),
                "temperature", 0.0,
                "max_tokens", maxTokens,
                "response_format", Map.of("type", "json_object"));
        return content(post(body, Duration.ofSeconds(30))).map(this::extractJsonObject);
    }

    /**
     * Multimodal call to a specific model. {@code userContent} is a list of OpenRouter content parts, e.g.
     * {@code {"type":"text",...}}, {@code {"type":"input_audio",...}}, {@code {"type":"image_url",...}}.
     * No response_format is sent: several free models do not support it. Returns the model's text answer.
     */
    @SuppressWarnings("null")
    public Optional<String> chat(String modelId, String system, List<Map<String, Object>> userContent, int maxTokens)
            throws Exception {
        List<Map<String, Object>> messages = List.of(
                Map.<String, Object>of("role", "system", "content", system),
                Map.<String, Object>of("role", "user", "content", userContent));
        Map<String, Object> body = Map.of(
                "model", modelId,
                "messages", messages,
                "temperature", 0.0,
                "max_tokens", maxTokens);
        return content(post(body, Duration.ofSeconds(120))).map(String::strip).filter(s -> !s.isEmpty());
    }

    private JsonNode post(Map<String, Object> body, Duration timeout) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
                .timeout(timeout)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new OpenRouterException(response.statusCode(), response.body());
        }
        return mapper.readTree(response.body());
    }

    private Optional<String> content(JsonNode root) {
        JsonNode content = root.at("/choices/0/message/content");
        if (content.isMissingNode() || content.isNull()) {
            log.warn("OpenRouter returned no message content (finish_reason={})",
                    root.at("/choices/0/finish_reason").asText("?"));
            return Optional.empty();
        }
        return Optional.of(content.asText());
    }

    /** Tolerates models that wrap the JSON in markdown fences or add a sentence around it. */
    private JsonNode extractJsonObject(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String cleaned = raw.trim()
                .replaceFirst("^```json\\s*", "")
                .replaceFirst("^```\\s*", "")
                .replaceFirst("\\s*```$", "")
                .trim();
        JsonNode node = tryParse(cleaned);
        if (node != null) return node;
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        return (start >= 0 && end > start) ? tryParse(cleaned.substring(start, end + 1)) : null;
    }

    private JsonNode tryParse(String text) {
        try {
            JsonNode node = mapper.readTree(text);
            return node != null && node.isObject() ? node : null;
        } catch (Exception e) {
            return null;
        }
    }
}
