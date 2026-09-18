package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.MissionResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class MissionEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public MissionEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishMissionUpdated(MissionResponse mission) {
        messagingTemplate.convertAndSend("/topic/missions", mission);
    }
}