package com.najda.backend.ai;

import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Generic client: the SAME class serves every model the AI team delivers. */
@Component
public class ModelInferenceClient {

    private final RestClient client;

    public ModelInferenceClient(@Qualifier("aiRestClient") RestClient client) {
        this.client = client;
    }

    /** Keys of {@code features} must equal the model manifest's feature names. Omit a feature to mark it missing. */
    public ModelPrediction predict(String model, Map<String, Object> features) {
        return client.post()
                .uri("/v1/models/{model}/predict", model)
                .body(Map.of("features", features))
                .retrieve()
                .body(ModelPrediction.class);
    }
}
