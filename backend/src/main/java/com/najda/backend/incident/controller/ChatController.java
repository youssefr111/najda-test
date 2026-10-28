package com.najda.backend.incident.controller;

import com.najda.backend.incident.dto.SendChatMessageRequest;
import com.najda.backend.incident.service.ChatService;
import com.najda.backend.user.model.User;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents/{incidentId}/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public ResponseEntity<?> getMessages(@AuthenticationPrincipal User user, @PathVariable Long incidentId) {
        try {
            return ResponseEntity.ok(chatService.getMessages(user.getId(), incidentId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(
            @AuthenticationPrincipal User user,
            @PathVariable Long incidentId,
            @RequestBody SendChatMessageRequest request) {
        try {
            return ResponseEntity.ok(chatService.sendMessage(user.getId(), incidentId, request.content()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }
}