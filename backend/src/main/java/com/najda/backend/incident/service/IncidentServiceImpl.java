package com.najda.backend.incident.service;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.IncidentMediaResponse;
import com.najda.backend.incident.dto.IncidentResponse;
import com.najda.backend.incident.dto.SubmitIncidentRequest;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentMedia;
import com.najda.backend.incident.model.IncidentStatus;
import com.najda.backend.incident.model.MediaType;
import com.najda.backend.incident.model.Mission;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.incident.repository.IncidentMediaRepository;
import com.najda.backend.incident.repository.IncidentRepository;
import com.najda.backend.incident.repository.MissionParticipantRepository;
import com.najda.backend.incident.repository.MissionRepository;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.incident.repository.ChatMessageRepository;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IncidentServiceImpl implements IncidentService {

    private static final List<IncidentStatus> OPEN_STATUSES = List.of(
        IncidentStatus.NEW, IncidentStatus.AI_PROCESSED, IncidentStatus.DISPATCHER_REVIEW);

    private static final Set<IncidentStatus> EDITABLE_STATUSES =
        EnumSet.of(IncidentStatus.NEW, IncidentStatus.AI_PROCESSED, IncidentStatus.DISPATCHER_REVIEW);

    private static final List<IncidentStatus> ACTIVE_STATUSES = List.of(
        IncidentStatus.NEW, IncidentStatus.AI_PROCESSED, IncidentStatus.DISPATCHER_REVIEW,
        IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS);

    private final IncidentRepository incidentRepository;
    private final IncidentMediaRepository incidentMediaRepository;
    private final MissionRepository missionRepository;
    private final MissionParticipantRepository missionParticipantRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final AiPriorityService aiPriorityService;
    private final AiDuplicateDetectionService aiDuplicateDetectionService;
    private final ResponseUnitRepository responseUnitRepository;
    private final IncidentEventPublisher incidentEventPublisher;
    private final ReverseGeocodingService reverseGeocodingService;

    public IncidentServiceImpl(
            IncidentRepository incidentRepository,
            IncidentMediaRepository incidentMediaRepository,
            MissionRepository missionRepository,
            MissionParticipantRepository missionParticipantRepository,
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            AiPriorityService aiPriorityService,
            AiDuplicateDetectionService aiDuplicateDetectionService,
            ResponseUnitRepository responseUnitRepository,
            ReverseGeocodingService reverseGeocodingService,
            IncidentEventPublisher incidentEventPublisher) {
        this.incidentRepository = incidentRepository;
        this.incidentMediaRepository = incidentMediaRepository;
        this.missionRepository = missionRepository;
        this.missionParticipantRepository = missionParticipantRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.aiPriorityService = aiPriorityService;
        this.aiDuplicateDetectionService = aiDuplicateDetectionService;
        this.responseUnitRepository = responseUnitRepository;
        this.reverseGeocodingService = reverseGeocodingService;
        this.incidentEventPublisher = incidentEventPublisher;
    }

    @Override
    public List<IncidentResponse> getAll() {
        return incidentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public IncidentResponse submit(Long citizenId, SubmitIncidentRequest request) {
        User citizen = userRepository.findById(citizenId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean hasActiveIncident = incidentRepository.findByCitizenId(citizen.getId()).stream()
        .anyMatch(i -> ACTIVE_STATUSES.contains(i.getStatus()));

        if (hasActiveIncident) {
            throw new ConflictException("You already have an active emergency. You can't submit another until it's resolved.");
        }

        Incident incident = new Incident();
        incident.setCitizen(citizen);
        incident.setCategory(request.category());
        incident.setLatitude(request.latitude());
        incident.setLongitude(request.longitude());
        incident.setLocationSource(request.locationSource());
        incident.setInjuredCount(request.injuredCount() != null ? request.injuredCount() : 0);
        incident.setStatus(IncidentStatus.NEW);
        incidentRepository.save(incident);

        aiDuplicateDetectionService.checkAsync(incident.getId());
        aiPriorityService.classifyAsync(incident.getId(), incident.getCategory(), request.textMessage(), incidentRepository);
        reverseGeocodingService.resolveAsync(incident.getId(), incident.getLatitude(), incident.getLongitude(), incidentRepository);

        if (request.textMessage() != null && !request.textMessage().isBlank()) {
            IncidentMedia textMessage = new IncidentMedia();
            textMessage.setIncident(incident);
            textMessage.setMediaType(MediaType.TEXT);
            textMessage.setTextContent(request.textMessage());
            incidentMediaRepository.save(textMessage);
        }

        IncidentResponse response = toResponse(incident);
        incidentEventPublisher.publishIncidentUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public IncidentResponse updateInjuredCount(Long callerId, Long incidentId, Integer injuredCount) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));

        if (!incident.getCitizen().getId().equals(callerId)) {
            throw new IllegalArgumentException("Only the citizen who submitted this incident can edit it");
        }
        if (!EDITABLE_STATUSES.contains(incident.getStatus())) {
            throw new ConflictException("This incident has already been assigned -- injured count can no longer be edited");
        }
        if (injuredCount == null || injuredCount < 0) {
            throw new IllegalArgumentException("Injured count must be 0 or greater");
        }

        incident.setInjuredCount(injuredCount);
        IncidentResponse response = toResponse(incidentRepository.save(incident));
        incidentEventPublisher.publishIncidentUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public IncidentResponse cancel(Long citizenId, Long incidentId, String reason) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));

        if (!incident.getCitizen().getId().equals(citizenId)) {
            throw new IllegalArgumentException("Only the citizen who submitted this incident can cancel it");
        }

        if (incident.getStatus() == IncidentStatus.RESOLVED
                || incident.getStatus() == IncidentStatus.CANCELLED) {
            throw new ConflictException("This incident is already closed");
        }

        List<Mission> missions = missionRepository.findByIncidentId(incidentId);

        boolean anyArrived = missions.stream()
                .anyMatch(m -> m.getStatus() == MissionStatus.ARRIVED || m.getStatus() == MissionStatus.COMPLETED);
        if (anyArrived) {
            throw new ConflictException("Cannot cancel -- a unit has already arrived on scene");
        }

        boolean anyEnRoute = missions.stream().anyMatch(m -> m.getStatus() == MissionStatus.EN_ROUTE);
        boolean anyAccepted = missions.stream().anyMatch(m -> m.getStatus() == MissionStatus.ACCEPTED);

        if ((anyEnRoute || anyAccepted) && (reason == null || reason.isBlank())) {
            throw new IllegalArgumentException("A reason is required once a unit has accepted this incident");
        }

        incident.setStatus(IncidentStatus.CANCELLED);
        incident.setCancellationReason(reason);
        incident.setCancelledBy(incident.getCitizen());
        incident.setCancelledAt(LocalDateTime.now());
        incidentRepository.save(incident);

        IncidentResponse response = toResponse(incident);
        incidentEventPublisher.publishIncidentUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public IncidentResponse completeIncident(Long callerId, Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));

        if (incident.getStatus() == IncidentStatus.RESOLVED || incident.getStatus() == IncidentStatus.CANCELLED) {
            throw new ConflictException("This incident is already " + incident.getStatus());
        }

        User caller = userRepository.findById(callerId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isDispatcherOrAdmin = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (!isDispatcherOrAdmin) {
            throw new IllegalArgumentException("Only a dispatcher or admin can mark the whole incident complete");
        }

        for (Mission mission : missionRepository.findByIncidentId(incidentId)) {
            if (mission.getStatus() != MissionStatus.COMPLETED && mission.getStatus() != MissionStatus.CANCELLED
                    && mission.getStatus() != MissionStatus.REJECTED) {
                mission.setStatus(MissionStatus.COMPLETED);
                mission.setCompletedAt(LocalDateTime.now());
                missionRepository.save(mission);

                ResponseUnit unit = mission.getUnit();
                unit.setStatus(UnitStatus.AVAILABLE);
                responseUnitRepository.save(unit);
            }
        }

        incident.setStatus(IncidentStatus.RESOLVED);
        IncidentResponse response = toResponse(incidentRepository.save(incident));
        incidentEventPublisher.publishIncidentUpdated(response);
        return response;
    }

    @Override
    public List<IncidentResponse> getQueue() {
        return incidentRepository.findByStatusInOrderByCreatedAtAsc(OPEN_STATUSES)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<IncidentResponse> getActive() {
        return incidentRepository.findByStatusInOrderByCreatedAtAsc(ACTIVE_STATUSES)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<IncidentResponse> getMine(Long citizenId) {
        return incidentRepository.findByCitizenIdOrderByCreatedAtDesc(citizenId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public IncidentResponse getById(Long callerId, Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));

        requireCanView(callerId, incident);

        return toResponse(incident);
    }

    @Override
    @Transactional
    public IncidentResponse markDuplicate(Long callerId, Long incidentId, Long canonicalIncidentId) {
        User caller = userRepository.findById(callerId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isDispatcherOrAdmin = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (!isDispatcherOrAdmin) {
            throw new IllegalArgumentException("Only a dispatcher or admin can mark an incident as a duplicate");
        }
        if (incidentId.equals(canonicalIncidentId)) {
            throw new IllegalArgumentException("An incident cannot be marked a duplicate of itself");
        }

        Incident incident = incidentRepository.findById(incidentId).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        Incident canonical = incidentRepository.findById(canonicalIncidentId).orElseThrow(() -> new ResourceNotFoundException("Canonical incident not found"));

        incident.setDuplicateOf(canonical);
        incident.setStatus(IncidentStatus.CANCELLED);
        incident.setCancellationReason("Duplicate of incident #" + canonicalIncidentId);
        incident.setCancelledAt(LocalDateTime.now());

        IncidentResponse response = toResponse(incidentRepository.save(incident));
        incidentEventPublisher.publishIncidentUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public IncidentResponse dismissDuplicateSuggestion(Long callerId, Long incidentId) {
        User caller = userRepository.findById(callerId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isDispatcherOrAdmin = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (!isDispatcherOrAdmin) {
            throw new IllegalArgumentException("Only a dispatcher or admin can dismiss a duplicate suggestion");
        }

        Incident incident = incidentRepository.findById(incidentId).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        incident.setAiSuggestedDuplicateOf(null);
        incident.setAiDuplicateConfidence(null);
        return toResponse(incidentRepository.save(incident));
    }

    @SuppressWarnings("null")
    @Override
    public void retryAiPriority(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        String textMessage = incidentMediaRepository.findByIncidentId(incidentId).stream()
                .filter(m -> m.getMediaType() == MediaType.TEXT)
                .findFirst().map(IncidentMedia::getTextContent).orElse(null);
        aiPriorityService.classifyAsync(incidentId, incident.getCategory(), textMessage, incidentRepository);
    }

    @Override
    @Transactional
    public void deleteIncident(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));

        for (Mission mission : missionRepository.findByIncidentId(incidentId)) {
            ResponseUnit unit = mission.getUnit();
            if (unit.getStatus() == UnitStatus.BUSY) {
                unit.setStatus(UnitStatus.AVAILABLE);
                responseUnitRepository.save(unit);
            }
            missionRepository.delete(mission);
        }

        chatMessageRepository.deleteByIncidentId(incidentId);

        incidentRepository.delete(incident);
    }

    private void requireCanView(Long callerId, Incident incident) {
        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isDispatcherOrAdmin = caller.getRole() != null && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN")
                .contains(caller.getRole().getRoleName().toUpperCase());

        if (isDispatcherOrAdmin || incident.getCitizen().getId().equals(callerId)) {
            return;
        }

        // Viewing history is different from acting on an incident -- anyone
        // who was ever a participant (including a long-completed mission)
        // can still look back at it, not just currently-active ones.
        List<Mission> missions = missionRepository.findByIncidentId(incident.getId());
        boolean wasEverParticipant = missions.stream()
                .flatMap(m -> missionParticipantRepository.findByMissionId(m.getId()).stream())
                .anyMatch(p -> p.getUser().getId().equals(callerId));

        if (!wasEverParticipant) {
            throw new IllegalArgumentException("You do not have access to this incident");
        }
    }
    
    private IncidentResponse toResponse(Incident incident) {
        List<IncidentMediaResponse> media = incidentMediaRepository.findByIncidentId(incident.getId())
                .stream()
                .map(m -> new IncidentMediaResponse(
                        m.getId(), m.getMediaType(), m.getTextContent(),
                        m.getUploadedAt(), m.getUpdatedAt()))
                .toList();

        return new IncidentResponse(
                incident.getId(), incident.getCitizen().getId(),
                incident.getCitizen().getFirstName() + " " + incident.getCitizen().getLastName(),
                incident.getCategory(), incident.getLatitude(), incident.getLongitude(),
                incident.getLocationSource(), incident.getSource(),incident.getAddress(), incident.getInjuredCount(), incident.getStatus(), incident.getAiPriority(),
                incident.getAiConfidence(), incident.getAiSuggestedDuplicateOf() == null ? null : incident.getAiSuggestedDuplicateOf().getId(), 
                incident.getAiDuplicateConfidence(), media, incident.getCreatedAt());
    }
}