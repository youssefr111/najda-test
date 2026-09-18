package com.najda.backend.unit.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class UnitEventPublisher {
    private final SimpMessagingTemplate messagingTemplate;
    public UnitEventPublisher(SimpMessagingTemplate messagingTemplate) { this.messagingTemplate = messagingTemplate; }
    public void notifyUnitsChanged() {
        messagingTemplate.convertAndSend("/topic/units", (Object) java.util.Map.of("type", "refresh"));
    }
}