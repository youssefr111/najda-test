package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.ChatMessageResponse;
import java.util.List;

public interface ChatService {
    ChatMessageResponse sendMessage(Long senderId, Long incidentId, String content);
    List<ChatMessageResponse> getMessages(Long requesterId, Long incidentId);
}