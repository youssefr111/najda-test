package com.najda.backend.notification.service;

import com.najda.backend.notification.model.DeviceToken;
import com.najda.backend.notification.model.NotificationType;
import com.najda.backend.notification.model.UserNotification;
import com.najda.backend.notification.repository.DeviceTokenRepository;
import com.najda.backend.notification.repository.UserNotificationRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Turns a {@link NotificationRequested} into, for every recipient: an inbox row,
 * a live "refresh" nudge for open apps, and a push to their registered devices.
 *
 * Runs on its own thread after the originating transaction commits, so a slow or
 * failing push provider can never delay or break the request that caused it.
 */
@Component
public class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);

    /** A burst of chat messages becomes one notification, not twenty. */
    private static final long CHAT_COALESCE_SECONDS = 60;

    private final UserNotificationRepository notifications;
    private final DeviceTokenRepository devices;
    private final PushSender pushSender;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationDispatcher(
            UserNotificationRepository notifications,
            DeviceTokenRepository devices,
            PushSender pushSender,
            SimpMessagingTemplate messagingTemplate) {
        this.notifications = notifications;
        this.devices = devices;
        this.pushSender = pushSender;
        this.messagingTemplate = messagingTemplate;
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRequested(NotificationRequested request) {
        try {
            deliver(request);
        } catch (RuntimeException e) {
            // Notifications are best-effort by design: never propagate.
            log.warn("Could not deliver {} notification: {}", request.type(), e.getMessage(), e);
        }
    }

    void deliver(NotificationRequested request) {
        Map<String, String> title = NotificationMessages.title(request.type(), request.params());
        Map<String, String> body = NotificationMessages.body(request.type(), request.params());
        List<PushSender.PushMessage> pushes = new ArrayList<>();

        for (Long userId : new LinkedHashSet<>(request.userIds())) {
            if (isCoalescedChat(request, userId)) continue;

            UserNotification saved = notifications.save(toRow(request, userId, title, body));
            nudge(userId);

            for (DeviceToken device : devices.findByUserId(userId)) {
                Map<String, String> data = new java.util.HashMap<>(request.data());
                data.put("type", request.type().name());
                data.put("notificationId", String.valueOf(saved.getId()));
                pushes.add(new PushSender.PushMessage(
                        device.getToken(),
                        device.getPlatform(),
                        NotificationMessages.pick(title, device.getLocale()),
                        NotificationMessages.pick(body, device.getLocale()),
                        data,
                        request.type().isUrgent()));
            }
        }

        Set<String> dead = pushSender.send(pushes);
        if (!dead.isEmpty()) {
            devices.deleteByTokenIn(dead); // the provider says these devices are gone
            log.info("Removed {} unregistered device token(s)", dead.size());
        }
    }

    private boolean isCoalescedChat(NotificationRequested request, Long userId) {
        if (request.type() != NotificationType.CHAT_MESSAGE || request.incidentId() == null) return false;
        return notifications.existsByUserIdAndTypeAndIncidentIdAndReadAtIsNullAndCreatedAtAfter(
                userId, NotificationType.CHAT_MESSAGE, request.incidentId(),
                Instant.now().minus(CHAT_COALESCE_SECONDS, ChronoUnit.SECONDS));
    }

    private static UserNotification toRow(
            NotificationRequested request, Long userId, Map<String, String> title, Map<String, String> body) {
        UserNotification row = new UserNotification();
        row.setUserId(userId);
        row.setType(request.type());
        row.setTitle(title);
        row.setBody(body);
        row.setData(request.data());
        row.setIncidentId(request.incidentId());
        return row;
    }

    /** Payload-free nudge: an open app refetches its inbox (same pattern as the other topics). */
    private void nudge(Long userId) {
        messagingTemplate.convertAndSend("/topic/users/" + userId + "/notifications", (Object) Map.of("type", "refresh"));
    }
}
