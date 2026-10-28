package com.najda.backend.facility.service;

import com.najda.backend.config.AfterCommit;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/** Tells open admin screens that facility data changed (e.g. a facility became registered) so they refetch. */
@Service
public class FacilityEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public FacilityEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyFacilitiesChanged() {
        AfterCommit.run(() -> messagingTemplate.convertAndSend("/topic/facilities", (Object) Map.of("type", "refresh")));
    }
}
