package com.najda.backend.notification.config;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.Executor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import com.najda.backend.notification.repository.DeviceTokenRepository;
import com.najda.backend.notification.repository.UserNotificationRepository;

/** Async delivery so a slow push provider never holds up an API request. */
@Configuration
@EnableAsync
public class NotificationConfig {

    @Bean("notificationExecutor")
    public Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("notify-");
        executor.initialize();
        return executor;
    }

    /** Keeps the tables small: old notifications and devices that stopped checking in. */
    @Component
    static class Maintenance {

        private static final Logger log = LoggerFactory.getLogger(Maintenance.class);
        private static final int NOTIFICATION_RETENTION_DAYS = 90;
        private static final int DEVICE_RETENTION_DAYS = 90;

        private final UserNotificationRepository notifications;
        private final DeviceTokenRepository devices;

        Maintenance(UserNotificationRepository notifications, DeviceTokenRepository devices) {
            this.notifications = notifications;
            this.devices = devices;
        }

        @Scheduled(cron = "0 30 3 * * *")
        void purge() {
            int removedNotifications =
                    notifications.deleteOlderThan(Instant.now().minus(NOTIFICATION_RETENTION_DAYS, ChronoUnit.DAYS));
            int removedDevices = devices.deleteStale(Instant.now().minus(DEVICE_RETENTION_DAYS, ChronoUnit.DAYS));
            log.info("Notification maintenance: removed {} notifications, {} stale devices",
                    removedNotifications, removedDevices);
        }
    }
}
