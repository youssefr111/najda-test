package com.najda.backend.incident.service;

import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.ChatMessageResponse;
import com.najda.backend.incident.model.ChatMessage;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.Mission;
import com.najda.backend.incident.model.MissionParticipant;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.incident.repository.ChatMessageRepository;
import com.najda.backend.incident.repository.IncidentRepository;
import com.najda.backend.incident.repository.MissionParticipantRepository;
import com.najda.backend.incident.repository.MissionRepository;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatServiceImpl implements ChatService {

    private static final Set<MissionStatus> ACTIVE_MISSION_STATUSES =
            EnumSet.of(MissionStatus.OFFERED, MissionStatus.ACCEPTED,
                       MissionStatus.EN_ROUTE, MissionStatus.ARRIVED);

    private final ChatMessageRepository chatMessageRepository;
    private final IncidentRepository incidentRepository;
    private final MissionRepository missionRepository;
    private final MissionParticipantRepository missionParticipantRepository;
    private final UserRepository userRepository;
    private final ChatEventPublisher chatEventPublisher;

    public ChatServiceImpl(
            ChatMessageRepository chatMessageRepository,
            IncidentRepository incidentRepository,
            MissionRepository missionRepository,
            MissionParticipantRepository missionParticipantRepository,
            UserRepository userRepository,
            ChatEventPublisher chatEventPublisher) {
        this.chatMessageRepository = chatMessageRepository;
        this.incidentRepository = incidentRepository;
        this.missionRepository = missionRepository;
        this.missionParticipantRepository = missionParticipantRepository;
        this.userRepository = userRepository;
        this.chatEventPublisher = chatEventPublisher;
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Long senderId, Long incidentId, String content) {
        Incident incident = requireIncident(incidentId);
        requireMember(senderId, incident);

        ChatMessage message = new ChatMessage();
        message.setIncident(incident);
        message.setSender(requireSender(senderId, incident));
        message.setContent(content);
        chatMessageRepository.save(message);

        ChatMessageResponse response = toResponse(message);
        chatEventPublisher.publishMessage(incidentId, response);
        return response;
    }

    @Override
    public List<ChatMessageResponse> getMessages(Long requesterId, Long incidentId) {
        Incident incident = requireIncident(incidentId);
        requireCanRead(requesterId, incident);

        return chatMessageRepository.findByIncidentIdOrderBySentAtAsc(incidentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void requireCanRead(Long userId, Incident incident) {
        if (incident.getCitizen().getId().equals(userId)) return;

        User caller = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isDispatcherOrAdmin = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (isDispatcherOrAdmin) return;

        List<Mission> missions = missionRepository.findByIncidentId(incident.getId());
        boolean wasEverParticipant = missions.stream()
                .flatMap(m -> missionParticipantRepository.findByMissionId(m.getId()).stream())
                .anyMatch(p -> p.getUser().getId().equals(userId));

        if (!wasEverParticipant) {
            throw new IllegalArgumentException("You are not part of this incident's response");
        }
    }

    private void requireMember(Long userId, Incident incident) {
        if (incident.getCitizen().getId().equals(userId)) {
            return;
        }

        User caller = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isDispatcherOrAdmin = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (isDispatcherOrAdmin) {
            return;
        }

        List<Mission> missions = missionRepository.findByIncidentId(incident.getId());
        boolean isActiveParticipant = missions.stream()
                .filter(m -> ACTIVE_MISSION_STATUSES.contains(m.getStatus()))
                .flatMap(m -> missionParticipantRepository.findByMissionId(m.getId()).stream())
                .anyMatch(p -> p.getUser().getId().equals(userId));

        if (!isActiveParticipant) {
            throw new IllegalArgumentException("You are not part of this incident's response");
        }
    }

    @SuppressWarnings("null")
    private User requireSender(Long userId, Incident incident) {
        if (incident.getCitizen().getId().equals(userId)) {
            return incident.getCitizen();
        }

        Optional<User> participant = missionRepository.findByIncidentId(incident.getId()).stream()
                .flatMap(m -> missionParticipantRepository.findByMissionId(m.getId()).stream())
                .map(MissionParticipant::getUser)
                .filter(u -> u.getId().equals(userId))
                .findFirst();
        if (participant.isPresent()) {
            return participant.get();
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Incident requireIncident(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
    }

    private ChatMessageResponse toResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getSender().getId(),
                message.getSender().getFirstName() + " " + message.getSender().getLastName(),
                message.getSender().getRole() != null ? message.getSender().getRole().getRoleName() : null,
                message.getContent(),
                message.getSentAt()
        );
    }
}