package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.VitalsUpdateResponse;
import com.najda.backend.config.AfterCommit;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class VitalsEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public VitalsEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishVitalsUpdate(Long hospitalTransferId, VitalsUpdateResponse vitals) {
        AfterCommit.run(() -> messagingTemplate.convertAndSend("/topic/hospital-transfers/" + hospitalTransferId + "/vitals", vitals));
    }

    /** Payload-free nudge: every open incident screen showing transfer vitals should refetch. */
    public void notifyVitalsChanged() {
        AfterCommit.run(() -> messagingTemplate.convertAndSend("/topic/vitals", (Object) java.util.Map.of("type", "refresh")));
    }

    /** Payload-free nudge: a hospital's incoming list (or a crew's transfer card) should refetch. */
    public void notifyTransfersChanged() {
        AfterCommit.run(() -> messagingTemplate.convertAndSend("/topic/hospital-transfers", (Object) java.util.Map.of("type", "refresh")));
    }
}