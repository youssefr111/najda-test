package com.najda.backend.mail;

/** Outbound email port for delivering messages through the configured mail provider. */
public interface EmailSender {
    /** @throws EmailDeliveryException if the message could not be handed to the mail provider. */
    void send(EmailMessage message);
}