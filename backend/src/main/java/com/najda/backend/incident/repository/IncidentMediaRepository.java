package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.IncidentMedia;
import com.najda.backend.incident.model.TranscriptStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface IncidentMediaRepository extends JpaRepository<IncidentMedia, Long> {
    List<IncidentMedia> findByIncidentId(Long incidentId);
    Optional<IncidentMedia> findByStoragePath(String storagePath);

    /**
     * Atomically claims a recording for transcription: PENDING -> PROCESSING, attempts + 1. Returns 1 for the
     * single worker that wins, 0 for everyone else, so two workers (or the retry job and a live event) can
     * never transcribe -- and bill -- the same file twice.
     */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("""
        UPDATE IncidentMedia m
           SET m.transcriptStatus = :processing, m.transcriptAttempts = m.transcriptAttempts + 1
         WHERE m.id = :id AND m.transcriptStatus = :pending
        """)
    int claimForTranscription(@Param("id") Long id,
                              @Param("pending") TranscriptStatus pending,
                              @Param("processing") TranscriptStatus processing);

    /** Recordings stuck in PENDING (a retry was scheduled) or PROCESSING (the server died mid-call). */
    @Query("""
        SELECT m.id FROM IncidentMedia m
         WHERE m.transcriptStatus IN :statuses AND m.uploadedAt < :olderThan AND m.transcriptAttempts < :maxAttempts
         ORDER BY m.uploadedAt
        """)
    List<Long> findStaleTranscriptions(@Param("statuses") Collection<TranscriptStatus> statuses,
                                       @Param("olderThan") Instant olderThan,
                                       @Param("maxAttempts") int maxAttempts);

    /** Returns stuck PROCESSING rows to PENDING so the normal claim path picks them up again. */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("""
        UPDATE IncidentMedia m SET m.transcriptStatus = :pending
         WHERE m.id = :id AND m.transcriptStatus = :processing
        """)
    int releaseClaim(@Param("id") Long id,
                     @Param("processing") TranscriptStatus processing,
                     @Param("pending") TranscriptStatus pending);

    /** Rows that used up every attempt without finishing (e.g. the server died on the last one) become FAILED. */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("""
        UPDATE IncidentMedia m SET m.transcriptStatus = :failed
         WHERE m.transcriptStatus IN :open AND m.uploadedAt < :olderThan AND m.transcriptAttempts >= :maxAttempts
        """)
    int failExhausted(@Param("open") Collection<TranscriptStatus> open,
                      @Param("olderThan") Instant olderThan,
                      @Param("maxAttempts") int maxAttempts,
                      @Param("failed") TranscriptStatus failed);
}
