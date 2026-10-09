package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.ChatMessageResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ChatEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public ChatEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishMessage(Long incidentId, ChatMessageResponse message) {
        messagingTemplate.convertAndSend("/topic/incidents/" + incidentId + "/chat", message);
    }
}