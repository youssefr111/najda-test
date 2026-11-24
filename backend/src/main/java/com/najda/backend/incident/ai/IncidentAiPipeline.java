package com.najda.backend.incident.ai;

import com.najda.backend.incident.ai.IncidentAiEvents.EvidenceChanged;
import com.najda.backend.incident.ai.IncidentAiEvents.MediaRegistered;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * The event wiring of the AI flow:
 *
 *   submit / edit message ........................ EvidenceChanged -> analyse (priority + duplicates)
 *   voice note, video or photo registered ........ MediaRegistered -> read it -> EvidenceChanged -> analyse
 *
 * The first analysis therefore runs immediately on the written message, and a second one refines it as soon as
 * the transcript / description is available -- dispatchers get an early priority, then a better one.
 *
 * Listeners fire only after the publishing transaction commits (so they always see the saved data) and run on
 * bounded thread pools instead of a new Thread per request. fallbackExecution lets non-transactional publishers
 * (the retry job, the manual "retry AI" endpoint) trigger them too.
 */
@Component
public class IncidentAiPipeline {

    private static final Logger log = LoggerFactory.getLogger(IncidentAiPipeline.class);

    private final MediaUnderstandingService mediaService;
    private final IncidentAiAnalysisService analysisService;

    public IncidentAiPipeline(MediaUnderstandingService mediaService, IncidentAiAnalysisService analysisService) {
        this.mediaService = mediaService;
        this.analysisService = analysisService;
    }

    @Async("transcriptionExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onMediaRegistered(MediaRegistered event) {
        try {
            mediaService.process(event.mediaId());
        } catch (Exception e) {
            log.warn("Media pipeline error for media {}: {}", event.mediaId(), e.getMessage());
        }
    }

    @Async("aiExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onEvidenceChanged(EvidenceChanged event) {
        try {
            analysisService.analyze(event.incidentId());
        } catch (Exception e) {
            log.warn("AI analysis pipeline error for incident {}: {}", event.incidentId(), e.getMessage());
        }
    }
}
