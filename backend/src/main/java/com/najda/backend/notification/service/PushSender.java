package com.najda.backend.notification.service;

import java.util.Collection;
import java.util.Map;
import java.util.Set;

/** Delivers a push message to devices. The only code that knows which provider is used. */
public interface PushSender {

    /** One message to one device, already written in that device's language. */
    record PushMessage(String token, String platform, String title, String body, Map<String, String> data, boolean urgent) {}

    /** Sends the messages and returns the tokens the provider says are dead (to be deleted). */
    Set<String> send(Collection<PushMessage> messages);
}
