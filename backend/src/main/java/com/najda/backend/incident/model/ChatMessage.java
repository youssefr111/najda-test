package com.najda.backend.incident.model;

import com.najda.backend.user.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * One thread per Incident, not per Mission -- a citizen with multiple
 * units responding (ambulance + police, say) sees one conversation, not
 * several. Membership (who may read/send) is computed on demand in
 * ChatService rather than stored, since it would otherwise need separate
 * upkeep every time a Mission is accepted/rejected/reassigned.
 */
@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Convert(converter = MessageContentConverter.class)
    @Column(columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;
}