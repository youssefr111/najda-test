package com.najda.backend.mail;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/** Sends email through Brevo's transactional HTTPS API (port 443, works on hosts that block SMTP). */
@Slf4j
@Component
class BrevoEmailSender implements EmailSender {

    private final RestClient client;
    private final Party sender;

    BrevoEmailSender(EmailProperties properties) {
        // Short timeouts: this call happens while the OTP row is locked.
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        this.sender = new Party(properties.fromName(), properties.fromEmail());
        this.client = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory)
                .defaultHeader("api-key", properties.apiKey())
                .defaultHeader("accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public void send(EmailMessage message) {
        BrevoRequest body = new BrevoRequest(
                sender,
                List.of(new Party(null, message.to())),
                message.subject(),
                message.html(),
                message.text());
        try {
            client.post()
                    .uri("/v3/smtp/email")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            log.error("Brevo rejected the email ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new EmailDeliveryException("Email provider rejected the message", e);
        } catch (RestClientException e) {
            log.error("Could not reach Brevo", e);
            throw new EmailDeliveryException("Email provider unreachable", e);
        }
    }

    record Party(String name, String email) {
    }

    record BrevoRequest(Party sender, List<Party> to, String subject, String htmlContent, String textContent) {
    }
}