package com.najda.backend.user.service;

import com.najda.backend.config.AfterCommit;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/** Tells open admin screens that user data changed so they refetch. Carries no user data, only a nudge. */
@Service
public class UserEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public UserEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyUsersChanged() {
        AfterCommit.run(() -> messagingTemplate.convertAndSend("/topic/users", (Object) Map.of("type", "refresh")));
    }
}