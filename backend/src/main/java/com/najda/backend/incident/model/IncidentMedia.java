package com.najda.backend.incident.model;

import jakarta.persistence.*;
import java.time.Instant;
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

    /**
     * Machine-extracted text: the speech transcript for AUDIO / VIDEO rows, a short visual description for PHOTO
     * rows. Encrypted at rest exactly like {@link #textContent}: it is the caller's words / what the caller saw.
     * Null until analysis finishes, and for TEXT rows.
     */
    @Convert(converter = MessageContentConverter.class)
    @Column(name = "transcript", columnDefinition = "TEXT")
    private String transcript;

    @Enumerated(EnumType.STRING)
    @Column(name = "transcript_status", length = 20)
    private TranscriptStatus transcriptStatus;

    /**
     * Arabic version of a PHOTO's description ({@link #transcript} is the English original, which the dispatch AI
     * reads). Null for audio / video, whose transcript stays in the language spoken, and when the model gave none.
     * Encrypted at rest like {@link #transcript}.
     */
    @Convert(converter = MessageContentConverter.class)
    @Column(name = "transcript_ar", columnDefinition = "TEXT")
    private String transcriptAr;

    /** Language the model detected in a voice note / video, as an ISO 639-1 code: "ar", "en", ... */
    @Column(name = "transcript_language", length = 32)
    private String transcriptLanguage;

    @Column(name = "transcript_attempts", nullable = false)
    private int transcriptAttempts = 0;

    @Column(name = "transcribed_at")
    private Instant transcribedAt;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    /** Only ever changes for TEXT entries -- see IncidentMediaService.editTextMessage. */
    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}