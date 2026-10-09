package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.ChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByIncidentIdOrderBySentAtAsc(Long incidentId);
    void deleteByIncidentId(Long incidentId);
}