package com.najda.backend.ai;

import com.najda.backend.incident.dto.VitalsUpdateRequest;
import com.najda.backend.incident.model.AiPriority;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/** Scores a patient's vitals with the "vitals_severity" model (ESI 1-5). Advisory only. */
@Service
public class VitalsSeverityService {

    private static final Logger log = LoggerFactory.getLogger(VitalsSeverityService.class);
    static final String MODEL = "vitals_severity";

    private final ModelInferenceClient inference;
    private final boolean enabled;

    public VitalsSeverityService(ModelInferenceClient inference,
                                 @Value("${najda.ai.enabled:true}") boolean enabled,
                                 @Value("${najda.ai.api-key:}") String apiKey) {
        this.inference = inference;
        this.enabled = enabled && !apiKey.isBlank();   // no key configured => feature off, backend unaffected
    }

    /** Call after the vitals row is saved. Never throws: a failed score must not affect the vitals flow. */
    @Async("aiExecutor")
    public void scoreAsync(Long vitalsUpdateId, VitalsUpdateRequest request) {
        if (!enabled) return;
        try {
            ModelPrediction p = inference.predict(MODEL, toFeatures(request));
            int esi = Integer.parseInt(p.prediction().label());      // labels come from the model manifest
            AiPriority priority = toPriority(esi);
            // TODO: persist esi / priority / confidence / p.model() / p.version() on the vitals row,
            //       then publish over the existing WebSocket publisher (VitalsEventPublisher).
            log.info("vitals {} -> ESI {} ({}), confidence {}, model {}@{}",
                    vitalsUpdateId, esi, priority, p.prediction().confidence(), p.model(), p.version());
        } catch (Exception e) {
            log.warn("vitals severity scoring failed for {}: {}", vitalsUpdateId, e.getMessage());
        }
    }

    /**
     * Names MUST match the manifest (GET /v1/models/vitals_severity). Nulls are omitted = "missing".
     * Confirm units with the AI team: "temperature" is assumed to be degC here.
     * age / sex / labs / pain_score are not collected by the app yet, so they stay missing.
     */
    static Map<String, Object> toFeatures(VitalsUpdateRequest r) {
        Map<String, Object> f = new LinkedHashMap<>();
        put(f, "heart_rate", r.heartRate());
        put(f, "systolic_bp", r.bloodPressureSystolic());
        put(f, "diastolic_bp", r.bloodPressureDiastolic());
        put(f, "spo2", r.spo2());
        put(f, "respiratory_rate", r.respiratoryRate());
        put(f, "temperature", r.temperatureCelsius());
        return f;
    }

    private static void put(Map<String, Object> m, String key, Object value) {
        if (value != null) m.put(key, value);
    }

    /** Product/clinical decision: confirm this mapping with your medical lead. */
    static AiPriority toPriority(int esi) {
        return switch (esi) {
            case 1 -> AiPriority.CRITICAL;
            case 2 -> AiPriority.HIGH;
            case 3 -> AiPriority.MEDIUM;
            default -> AiPriority.LOW;   // ESI 4-5
        };
    }
}
