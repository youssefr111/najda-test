package com.najda.backend.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/** Response of POST /v1/models/{name}/predict. Same shape for every model. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ModelPrediction(
        String model,
        String version,
        Prediction prediction,
        @JsonProperty("missing_features") List<String> missingFeatures,
        List<String> warnings
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Prediction(String label, double confidence, Map<String, Double> probabilities) {}
}
