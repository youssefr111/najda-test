package com.najda.backend.notification.service;

import com.najda.backend.notification.model.NotificationType;
import java.util.Collection;
import java.util.Map;

/**
 * "These people should be told this." Published inside the business transaction
 * and only acted on once it has committed, so a rolled-back change never sends
 * a notification about something that did not happen.
 *
 * Recipients and text parameters are resolved up front (while the originating
 * transaction can still lazy-load), so handling needs no database session.
 */
public record NotificationRequested(
        Collection<Long> userIds,
        NotificationType type,
        Map<String, String> params,
        Map<String, String> data,
        Long incidentId) {}
