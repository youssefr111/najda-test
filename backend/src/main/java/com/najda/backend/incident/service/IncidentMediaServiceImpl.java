package com.najda.backend.incident.service;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.incident.ai.IncidentAiEvents;
import com.najda.backend.incident.ai.MediaUnderstandingService;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.CreateIncidentMediaRequest;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentMedia;
import com.najda.backend.incident.model.IncidentStatus;
import com.najda.backend.incident.model.MediaType;
import com.najda.backend.incident.model.TranscriptStatus;
import com.najda.backend.incident.repository.IncidentMediaRepository;
import com.najda.backend.incident.repository.IncidentRepository;
import com.najda.backend.incident.repository.MissionParticipantRepository;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.Optional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IncidentMediaServiceImpl implements IncidentMediaService {

    private static final Set<IncidentStatus> EDITABLE_STATUSES =
            EnumSet.of(IncidentStatus.NEW, IncidentStatus.AI_PROCESSED, IncidentStatus.DISPATCHER_REVIEW);

    /** Evidence can be ADDED any time the incident is still live -- new photos help
    responders already en route. Editing or removing existing evidence stays
    restricted to EDITABLE_STATUSES, since that's the record dispatch acted on. */
    private static final Set<IncidentStatus> ATTACHABLE_STATUSES =
            EnumSet.of(IncidentStatus.NEW, IncidentStatus.AI_PROCESSED, IncidentStatus.DISPATCHER_REVIEW,
                       IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS);

    private final IncidentMediaRepository incidentMediaRepository;
    private final IncidentRepository incidentRepository;
    private final SupabaseStorageService supabaseStorageService;
    private final MissionParticipantRepository missionParticipantRepository;
    private final UserRepository userRepository;
    private final IncidentEventPublisher incidentEventPublisher;
    private final MediaUnderstandingService mediaUnderstanding;
    private final ApplicationEventPublisher events;

    public IncidentMediaServiceImpl(
            IncidentMediaRepository incidentMediaRepository,
            IncidentRepository incidentRepository,
            SupabaseStorageService supabaseStorageService,
            MissionParticipantRepository missionParticipantRepository,
            IncidentEventPublisher incidentEventPublisher,
            UserRepository userRepository,
            MediaUnderstandingService mediaUnderstanding,
            ApplicationEventPublisher events) {
        this.mediaUnderstanding = mediaUnderstanding;
        this.events = events;
        this.incidentMediaRepository = incidentMediaRepository;
        this.incidentRepository = incidentRepository;
        this.supabaseStorageService = supabaseStorageService;
        this.missionParticipantRepository = missionParticipantRepository;
        this.userRepository = userRepository;
        this.incidentEventPublisher = incidentEventPublisher;
    }

    @Override
    public SupabaseStorageService.SignedUpload createUploadUrl(Long callerId, Long incidentId, String fileExtension) throws Exception {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));

        if (!incident.getCitizen().getId().equals(callerId)) {
            throw new IllegalArgumentException("Only the citizen who submitted this incident can attach evidence");
        }

        if (!ATTACHABLE_STATUSES.contains(incident.getStatus())) {
            throw new ConflictException("This incident is closed -- new evidence can no longer be attached");
        }

        return supabaseStorageService.createSignedUploadUrl(incidentId, fileExtension);
    }

    @Override
    @Transactional
    public IncidentMedia createMedia(Long callerId, CreateIncidentMediaRequest request) throws Exception {
        if (request.mediaType() == MediaType.TEXT) {
            throw new IllegalArgumentException(
                    "TEXT entries come from the incident's message at submission -- not through this endpoint");
        }
        if (request.path() == null || request.path().isBlank()) {
            throw new IllegalArgumentException("A storage path is required for PHOTO/VIDEO/AUDIO attachments");
        }
        if (!supabaseStorageService.isOwnedPath(request.path())) {
            throw new IllegalArgumentException("This path was not issued by this system's storage -- use /upload-url first");
        }

        Incident incident = incidentRepository.findById(request.incidentId())
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));

        if (!incident.getCitizen().getId().equals(callerId)) {
            throw new IllegalArgumentException("Only the citizen who submitted this incident can attach evidence");
        }

        // Idempotent by storage path: a client retrying after a lost response must not create a second row
        // for the same file.
        Optional<IncidentMedia> alreadyRegistered = incidentMediaRepository.findByStoragePath(request.path());
        if (alreadyRegistered.isPresent() && alreadyRegistered.get().getIncident().getId().equals(incident.getId())) {
            return alreadyRegistered.get();
        }

        if (!ATTACHABLE_STATUSES.contains(incident.getStatus())) {
            throw new ConflictException("This incident is closed -- new evidence can no longer be attached");
        }

        // Confirms an actual file was uploaded to this path -- prevents
        // registering a signed URL that was requested but never used, or
        // was tampered with client-side.
        if (!supabaseStorageService.objectExists(request.path())) {
            throw new IllegalArgumentException("No file was found at this path -- upload to the signed URL before registering it");
        }

        IncidentMedia media = new IncidentMedia();
        media.setIncident(incident);
        media.setMediaType(request.mediaType());
        media.setStoragePath(request.path());

        // Voice notes and videos are transcribed and photos are described, so the AI can read them like the
        // written message.
        boolean analyse = request.mediaType() != MediaType.TEXT && mediaUnderstanding.isEnabled();
        if (analyse) {
            media.setTranscriptStatus(TranscriptStatus.PENDING);
        }

        IncidentMedia saved = incidentMediaRepository.save(media);
        if (analyse) {
            // Handled after commit, on the media pool: the upload request returns immediately.
            events.publishEvent(new IncidentAiEvents.MediaRegistered(saved.getId()));
        }
        incidentEventPublisher.notifyIncidentsChanged();
        return saved;
    }

    @Override
    @Transactional
    public IncidentMedia editTextMessage(Long callerId, Long mediaId, String newContent) {
        IncidentMedia media = incidentMediaRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (media.getMediaType() != MediaType.TEXT) {
            throw new IllegalArgumentException("Only TEXT attachments can be edited");
        }

        Incident incident = media.getIncident();

        if (!incident.getCitizen().getId().equals(callerId)) {
            throw new IllegalArgumentException("Only the citizen who submitted this incident can edit it");
        }

        if (!EDITABLE_STATUSES.contains(incident.getStatus())) {
            throw new ConflictException("This incident has already been assigned -- the original message can no longer be edited");
        }

        media.setTextContent(newContent);
        IncidentMedia saved = incidentMediaRepository.save(media);
        events.publishEvent(new IncidentAiEvents.EvidenceChanged(incident.getId()));   // re-score the edited message
        return saved;
    }

    @Override
    @Transactional
    public void deleteMedia(Long callerId, Long mediaId) throws Exception {
        IncidentMedia media = incidentMediaRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found"));

        Incident incident = media.getIncident();
        boolean isOwner = incident.getCitizen().getId().equals(callerId);
        boolean isAdmin = !isOwner && isAdminUser(callerId);

        if (!isOwner && !isAdmin) {
            throw new IllegalArgumentException("You do not have access to remove this incident's evidence");
        }

        // Admin is a moderation override -- bypasses the editable-status gate.
        // The owning citizen is still restricted to it, same as every other
        // self-service edit on this incident.
        if (isOwner && !EDITABLE_STATUSES.contains(incident.getStatus())) {
            throw new ConflictException("This incident has already been assigned -- evidence can no longer be removed");
        }

        if (media.getMediaType() != MediaType.TEXT && media.getStoragePath() != null) {
            supabaseStorageService.deleteObject(media.getStoragePath());
        }
        incidentMediaRepository.delete(media);
    }

    private boolean isAdminUser(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getRole() != null && List.of("ADMIN", "SUPER_ADMIN").contains(u.getRole().getRoleName().toUpperCase()))
                .orElse(false);
    }

    @Override
    public String getDownloadUrl(Long callerId, Long mediaId) throws Exception {
        IncidentMedia media = incidentMediaRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found"));

        if (media.getMediaType() == MediaType.TEXT || media.getStoragePath() == null) {
            throw new IllegalArgumentException("This attachment has no downloadable file");
        }

        requireCanViewIncident(callerId, media.getIncident());

        return supabaseStorageService.createSignedDownloadUrl(media.getStoragePath());
    }

    private void requireCanViewIncident(Long callerId, Incident incident) {
        if (incident.getCitizen().getId().equals(callerId)) return;

        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isDispatcherOrAdmin = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (isDispatcherOrAdmin) return;

        // "Was offered it and did not turn it down," not "currently active" -- viewing an old, resolved incident's
        // evidence is a history lookup, not an action on it. A rejected or withdrawn offer gives no access.
        if (!missionParticipantRepository.hasAccessToIncident(callerId, incident.getId())) {
            throw new IllegalArgumentException("You do not have access to this incident's media");
        }
    }
}