package com.najda.backend.incident.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "incident_media")
@Getter
@Setter
@NoArgsConstructor
public class IncidentMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    /** Supabase Storage public URL -- populated for PHOTO/VIDEO/AUDIO, null for TEXT. */
    private String url;

    /** The raw bucket-relative path (e.g. "incident-42/uuid.jpg") -- kept
        separately from `url` so deletion doesn't require re-parsing it out of
        the public URL string. */
    @Column(name = "storage_path")
    private String storagePath;

    @Convert(converter = MessageContentConverter.class)
    @Column(columnDefinition = "TEXT")
    private String textContent;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false)
    private MediaType mediaType;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    /** Only ever changes for TEXT entries -- see IncidentMediaService.editTextMessage. */
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}