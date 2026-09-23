package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.IncidentResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class IncidentEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public IncidentEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishIncidentUpdated(IncidentResponse incident) {
        messagingTemplate.convertAndSend("/topic/incidents", incident);
    }

    public void notifyIncidentsChanged() {
        messagingTemplate.convertAndSend("/topic/incidents", (Object) java.util.Map.of("type", "refresh"));
    }
}