package com.najda.backend.kyc;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.exceptions.KycProviderException;
import com.najda.backend.kyc.config.KycProperties;
import com.najda.backend.kyc.service.DiditClient;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DiditClientDeleteTest {

    private HttpServer server;
    private int respondWith;
    private final AtomicReference<String> seen = new AtomicReference<>();
    private DiditClient client;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            seen.set(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath()
                    + " key=" + exchange.getRequestHeaders().getFirst("x-api-key") + " body=" + body);
            exchange.sendResponseHeaders(respondWith, -1);
            exchange.close();
        });
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        KycProperties props = new KycProperties(false, null, List.of(),
                new KycProperties.Didit(base, "the-key", "w", "s", "live", null, ""));
        client = new DiditClient(props, new ObjectMapper());
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void deletesTheSessionAndAsksForTheFaceDataToGoToo() {
        respondWith = 200;
        assertDoesNotThrow(() -> client.deleteSession("abc-123"));
        assertTrue(seen.get().startsWith("DELETE /v3/session/abc-123/delete/ key=the-key"));
        assertTrue(seen.get().contains("\"retain_face_embeddings\":false"));
    }

    @Test
    void anAlreadyDeletedSessionIsFine() {
        respondWith = 404;
        assertDoesNotThrow(() -> client.deleteSession("gone"));
    }

    @Test
    void otherFailuresAreReported() {
        respondWith = 503;
        KycProviderException e = assertThrows(KycProviderException.class, () -> client.deleteSession("x"));
        assertEquals("Didit could not delete the session (HTTP 503)", e.getMessage());
    }
}
