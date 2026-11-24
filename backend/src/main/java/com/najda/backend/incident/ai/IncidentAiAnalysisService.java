package com.najda.backend.incident.ai;

import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentStatus;
import com.najda.backend.incident.repository.IncidentRepository;
import com.najda.backend.incident.service.AiDuplicateDetectionService;
import com.najda.backend.incident.service.AiPriorityService;
import com.najda.backend.incident.service.IncidentEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Runs the AI analysis of one incident: priority, then duplicate suggestion, both over the same evidence.
 *
 * Every step is advisory. A failure is logged and swallowed so the incident itself is never affected; it simply
 * stays unscored and a dispatcher reviews it like any incident without a priority.
 */
@Service
public class IncidentAiAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(IncidentAiAnalysisService.class);
    private static final int WRITE_ATTEMPTS = 3;

    private final IncidentEvidenceAssembler assembler;
    private final AiPriorityService priorityService;
    private final AiDuplicateDetectionService duplicateService;
    private final IncidentRepository incidentRepository;
    private final IncidentEventPublisher incidentEventPublisher;
    private final TransactionTemplate tx;

    public IncidentAiAnalysisService(IncidentEvidenceAssembler assembler,
                                     AiPriorityService priorityService,
                                     AiDuplicateDetectionService duplicateService,
                                     IncidentRepository incidentRepository,
                                     IncidentEventPublisher incidentEventPublisher,
                                     TransactionTemplate tx) {
        this.assembler = assembler;
        this.priorityService = priorityService;
        this.duplicateService = duplicateService;
        this.incidentRepository = incidentRepository;
        this.incidentEventPublisher = incidentEventPublisher;
        this.tx = tx;
    }

    public void analyze(Long incidentId) {
        IncidentEvidence evidence = assembler.assemble(incidentId).orElse(null);
        if (evidence == null) return;   // deleted since the event was published
        String fingerprint = evidence.fingerprint();
        log.info("AI analysis starting for incident {}", incidentId);

        // Independent steps: one failing must not stop the other.
        try {
            priorityService.classify(evidence).ifPresent(result -> {
                if (isStillCurrent(incidentId, fingerprint)) {
                    applyPriority(incidentId, result);
                }
            });
        } catch (Exception e) {
            log.warn("AI priority classification failed for incident {}: {}", incidentId, e.getMessage());
        }

        try {
            duplicateService.detect(evidence).ifPresent(match -> {
                if (isStillCurrent(incidentId, fingerprint)) {
                    applyDuplicate(incidentId, match);
                }
            });
        } catch (Exception e) {
            log.warn("AI duplicate check failed for incident {}: {}", incidentId, e.getMessage());
        }
    }

    /**
     * A model call takes seconds. If the evidence changed meanwhile (a transcript finished, the message was
     * edited) this result describes an older state: drop it. The change published its own event, so a newer run
     * with the full evidence is already on its way and will write the result instead.
     */
    private boolean isStillCurrent(Long incidentId, String fingerprint) {
        boolean current = assembler.assemble(incidentId)
                .map(e -> e.fingerprint().equals(fingerprint))
                .orElse(false);
        if (!current) {
            log.info("Discarding stale AI result for incident {}: evidence changed while it ran", incidentId);
        }
        return current;
    }

    private void applyPriority(Long incidentId, AiPriorityService.Result result) {
        boolean written = writeWithRetry(incidentId, incident -> {
            incident.setAiPriority(result.priority());
            incident.setAiConfidence(result.confidence());
            if (incident.getStatus() == IncidentStatus.NEW) {
                incident.setStatus(IncidentStatus.AI_PROCESSED);
            }
        });
        if (written) {
            log.info("AI priority for incident {}: priority={}, confidence={}",
                    incidentId, result.priority(), result.confidence());
        }
    }

    private void applyDuplicate(Long incidentId, AiDuplicateDetectionService.Match match) {
        boolean written = writeWithRetry(incidentId, incident -> {
            if (incident.getDuplicateOf() != null) return;   // a dispatcher already linked it: do not second-guess
            incident.setAiSuggestedDuplicateOf(incidentRepository.getReferenceById(match.originalId()));
            incident.setAiDuplicateConfidence(match.confidence());
        });
        if (written) {
            log.info("AI suggests incident {} duplicates {} (confidence {})", incidentId, match.originalId(), match.confidence());
        }
    }

    /**
     * Incident has an optimistic-lock @Version and dispatchers edit it at the same time. Re-read and re-apply a
     * few times rather than lose the AI result to a harmless conflict.
     */
    private boolean writeWithRetry(Long incidentId, java.util.function.Consumer<Incident> change) {
        for (int attempt = 1; ; attempt++) {
            try {
                Boolean written = tx.execute(status -> incidentRepository.findById(incidentId).map(incident -> {
                    change.accept(incident);
                    incidentRepository.save(incident);
                    return true;
                }).orElse(false));
                if (Boolean.TRUE.equals(written)) {
                    incidentEventPublisher.notifyIncidentsChanged();   // after the commit above
                    return true;
                }
                return false;
            } catch (ObjectOptimisticLockingFailureException e) {
                if (attempt >= WRITE_ATTEMPTS) {
                    log.warn("Giving up writing AI result for incident {} after {} version conflicts", incidentId, attempt);
                    return false;
                }
            }
        }
    }
}
