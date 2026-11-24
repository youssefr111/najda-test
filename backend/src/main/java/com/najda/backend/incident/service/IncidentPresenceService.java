package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.IncidentViewerResponse;
import com.najda.backend.user.model.User;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Who has an incident open right now. Advisory only -- it never blocks anyone (a dispatcher who
 * walks away must not freeze an incident). In-memory and per instance, like InMemoryRateLimiter:
 * move it to a shared store if the backend is ever scaled horizontally.
 */
@Service
public class IncidentPresenceService {

    /** A viewer disappears this long after their last heartbeat (clients beat every 15s). */
    private static final Duration TTL = Duration.ofSeconds(45);

    private record Viewer(Long userId, String name, Instant lastSeen) {}

    private final Map<Long, Map<Long, Viewer>> viewersByIncident = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate messagingTemplate;

    public IncidentPresenceService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /** Registers or refreshes the caller and returns everyone else currently viewing. */
    public List<IncidentViewerResponse> heartbeat(Long incidentId, User user) {
        Map<Long, Viewer> viewers = viewersByIncident.computeIfAbsent(incidentId, id -> new ConcurrentHashMap<>());
        Viewer previous = viewers.put(user.getId(),
                new Viewer(user.getId(), user.getFirstName() + " " + user.getLastName(), Instant.now()));
        if (previous == null) announceChange(incidentId);
        return viewersExcluding(incidentId, user.getId());
    }

    public void leave(Long incidentId, Long userId) {
        Map<Long, Viewer> viewers = viewersByIncident.get(incidentId);
        if (viewers != null && viewers.remove(userId) != null) announceChange(incidentId);
    }

    @SuppressWarnings("null")
    public List<IncidentViewerResponse> viewersExcluding(Long incidentId, Long excludedUserId) {
        Instant cutoff = Instant.now().minus(TTL);
        return viewersByIncident.getOrDefault(incidentId, Map.of()).values().stream()
                .filter(viewer -> viewer.lastSeen().isAfter(cutoff) && !viewer.userId().equals(excludedUserId))
                .sorted(Comparator.comparing(Viewer::name))
                .map(viewer -> new IncidentViewerResponse(viewer.userId(), viewer.name()))
                .toList();
    }

    @Scheduled(fixedDelay = 15_000)
    public void pruneExpired() {
        Instant cutoff = Instant.now().minus(TTL);
        viewersByIncident.forEach((incidentId, viewers) -> {
            boolean removedAny = viewers.values().removeIf(viewer -> !viewer.lastSeen().isAfter(cutoff));
            if (viewers.isEmpty()) viewersByIncident.remove(incidentId, viewers);
            if (removedAny) announceChange(incidentId);
        });
    }

    /** Payload-free nudge: clients refetch the list themselves. */
    private void announceChange(Long incidentId) {
        messagingTemplate.convertAndSend("/topic/incidents/" + incidentId + "/presence", (Object) Map.of("type", "refresh"));
    }
}