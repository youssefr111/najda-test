package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.VitalsUpdateResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class VitalsEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public VitalsEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishVitalsUpdate(Long hospitalTransferId, VitalsUpdateResponse vitals) {
        messagingTemplate.convertAndSend("/topic/hospital-transfers/" + hospitalTransferId + "/vitals", vitals);
    }
}