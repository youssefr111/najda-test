package com.najda.backend.notification.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.ApnsConfig;
import com.google.firebase.messaging.Aps;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.SendResponse;
import com.google.firebase.messaging.WebpushConfig;
import com.google.firebase.messaging.WebpushFcmOptions;
import com.google.firebase.messaging.WebpushNotification;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Firebase Cloud Messaging via the Admin SDK (HTTP v1). FCM is free on the Spark
 * plan and needs nothing beyond the service account the backend already uses to
 * verify logins -- no Cloud Functions, no Blaze plan.
 *
 * Switch off with {@code najda.push.enabled=false} (e.g. in tests); the in-app
 * inbox keeps working either way.
 */
@Component
public class FcmPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(FcmPushSender.class);

    /** FCM accepts at most 500 messages per sendEach call. */
    private static final int BATCH_SIZE = 500;

    private final boolean enabled;
    private final String webBaseUrl;

    public FcmPushSender(
            @Value("${najda.push.enabled:true}") boolean enabled,
            @Value("${najda.web.base-url:https://najda-web.vercel.app}") String webBaseUrl) {
        this.enabled = enabled;
        this.webBaseUrl = webBaseUrl.endsWith("/") ? webBaseUrl.substring(0, webBaseUrl.length() - 1) : webBaseUrl;
    }

    @Override
    public Set<String> send(Collection<PushMessage> messages) {
        Set<String> dead = new HashSet<>();
        if (!enabled || messages.isEmpty() || FirebaseApp.getApps().isEmpty()) return dead;

        List<PushMessage> all = new ArrayList<>(messages);
        for (int from = 0; from < all.size(); from += BATCH_SIZE) {
            List<PushMessage> batch = all.subList(from, Math.min(from + BATCH_SIZE, all.size()));
            try {
                BatchResponse response = FirebaseMessaging.getInstance()
                        .sendEach(batch.stream().map(this::toMessage).toList());
                collectDeadTokens(batch, response, dead);
            } catch (FirebaseMessagingException | RuntimeException e) {
                // A push failure must never affect the business operation that caused it.
                log.warn("FCM batch of {} failed: {}", batch.size(), e.getMessage());
            }
        }
        return dead;
    }

    private void collectDeadTokens(List<PushMessage> batch, BatchResponse response, Set<String> dead) {
        List<SendResponse> results = response.getResponses();
        for (int i = 0; i < results.size(); i++) {
            SendResponse result = results.get(i);
            if (result.isSuccessful() || result.getException() == null) continue;
            MessagingErrorCode code = result.getException().getMessagingErrorCode();
            if (code == MessagingErrorCode.UNREGISTERED) {
                dead.add(batch.get(i).token());
            } else {
                log.warn("FCM rejected a message ({}): {}", code, result.getException().getMessage());
            }
        }
    }

    private Message toMessage(PushMessage m) {
        boolean urgent = m.urgent();
        // Channel ids must match the ones the Android app creates on start-up.
        String channel = urgent ? "najda_urgent" : "najda_updates";

        Message.Builder builder = Message.builder()
                .setToken(m.token())
                .setNotification(Notification.builder().setTitle(m.title()).setBody(m.body()).build())
                .putAllData(m.data());

        switch (m.platform()) {
            case "ANDROID" -> builder.setAndroidConfig(AndroidConfig.builder()
                    .setPriority(urgent ? AndroidConfig.Priority.HIGH : AndroidConfig.Priority.NORMAL)
                    // An undelivered mission offer is worthless after a few minutes.
                    .setTtl(urgent ? 10 * 60 * 1000L : 60 * 60 * 1000L)
                    .setNotification(AndroidNotification.builder().setChannelId(channel).build())
                    .build());
            case "IOS" -> builder.setApnsConfig(ApnsConfig.builder()
                    .putHeader("apns-priority", urgent ? "10" : "5")
                    .setAps(Aps.builder().setSound("default").build())
                    .build());
            default -> {
                WebpushConfig.Builder web = WebpushConfig.builder()
                        .setNotification(WebpushNotification.builder()
                                .setTitle(m.title())
                                .setBody(m.body())
                                .setIcon(webBaseUrl + "/icons/icon-192.png")
                                .build());
                // FCM only accepts https links for web push.
                if (webBaseUrl.startsWith("https://")) {
                    web.setFcmOptions(WebpushFcmOptions.withLink(webBaseUrl + "/notifications"));
                }
                builder.setWebpushConfig(web.build());
            }
        }
        return builder.build();
    }
}
