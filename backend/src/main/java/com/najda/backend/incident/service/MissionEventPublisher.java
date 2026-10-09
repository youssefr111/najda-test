package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.MissionResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class MissionEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public MissionEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishMissionUpdated(MissionResponse mission) {
        messagingTemplate.convertAndSend("/topic/missions", mission);
        publishRespondersChanged(mission.incidentId());
    }

    /** Payload-free nudge on a per-incident topic, so a map refetches only when something
        about *its* incident's responders changed -- and never has to subscribe to the
        system-wide /topic/missions feed, which carries full mission details. */
    public void publishRespondersChanged(Long incidentId) {
        messagingTemplate.convertAndSend(
                "/topic/incidents/" + incidentId + "/responders", (Object) Map.of("type", "refresh"));
    }
}