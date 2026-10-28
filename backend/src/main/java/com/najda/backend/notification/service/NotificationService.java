package com.najda.backend.notification.service;

import com.najda.backend.notification.dto.NotificationDtos.NotificationPage;
import com.najda.backend.notification.dto.NotificationDtos.NotificationResponse;
import com.najda.backend.notification.dto.NotificationDtos.RegisterDeviceRequest;
import com.najda.backend.notification.model.DeviceToken;
import com.najda.backend.notification.model.UserNotification;
import com.najda.backend.notification.repository.DeviceTokenRepository;
import com.najda.backend.notification.repository.UserNotificationRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reading the inbox and managing the caller's push devices. */
@Service
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserNotificationRepository notifications;
    private final DeviceTokenRepository devices;

    public NotificationService(UserNotificationRepository notifications, DeviceTokenRepository devices) {
        this.notifications = notifications;
        this.devices = devices;
    }

    @Transactional(readOnly = true)
    public NotificationPage list(Long userId, Long before, int limit) {
        int size = Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
        var pageable = PageRequest.of(0, size);
        List<UserNotification> rows = before == null
                ? notifications.findByUserIdOrderByIdDesc(userId, pageable)
                : notifications.findByUserIdAndIdLessThanOrderByIdDesc(userId, before, pageable);

        Long nextBefore = rows.size() == size ? rows.get(rows.size() - 1).getId() : null;
        return new NotificationPage(
                rows.stream().map(NotificationService::toResponse).toList(),
                nextBefore,
                notifications.countByUserIdAndReadAtIsNull(userId));
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notifications.countByUserIdAndReadAtIsNull(userId);
    }

    public void markRead(Long userId, Long notificationId) {
        notifications.markRead(notificationId, userId, Instant.now());
    }

    public void markAllRead(Long userId) {
        notifications.markAllRead(userId, Instant.now());
    }

    /**
     * Registers (or refreshes) a device. A token belongs to one user at a time: on a
     * shared phone, the person who signs in now takes it over.
     */
    @Transactional
    public void registerDevice(Long userId, RegisterDeviceRequest request) {
        String locale = request.locale() == null || request.locale().isBlank() ? "en" : request.locale();

        DeviceToken device = devices.findByToken(request.token()).orElseGet(DeviceToken::new);
        device.setToken(request.token());
        device.setUserId(userId);
        device.setPlatform(request.platform());
        device.setLocale(locale);
        device.setLastSeenAt(Instant.now());
        devices.save(device);
    }

    public void unregisterDevice(Long userId, String token) {
        devices.deleteByTokenAndUserId(token, userId);
    }

    private static NotificationResponse toResponse(UserNotification n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getData(), n.getCreatedAt(), n.getReadAt() != null);
    }
}
