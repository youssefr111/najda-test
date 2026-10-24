package com.najda.backend.kyc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.kyc.config.KycProperties;
import com.najda.backend.kyc.service.DiditClient;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DiditClientListTest {

    private HttpServer server;
    private DiditClient client;
    private String listBody;
    private final List<String> requests = new ArrayList<>();

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI());
            byte[] out;
            int code = 200;
            if ("GET".equals(exchange.getRequestMethod()) && exchange.getRequestURI().getPath().equals("/v3/sessions/")) {
                out = listBody.getBytes(StandardCharsets.UTF_8);
                // once a session was "deleted", the list is empty
                if (requests.stream().anyMatch(r -> r.startsWith("DELETE"))) out = "{\"results\":[]}".getBytes(StandardCharsets.UTF_8);
            } else {
                out = new byte[0];
            }
            exchange.sendResponseHeaders(code, out.length == 0 ? -1 : out.length);
            if (out.length > 0) exchange.getResponseBody().write(out);
            exchange.close();
        });
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        client = new DiditClient(new KycProperties(false, null, List.of(),
                new KycProperties.Didit(base, "k", "w", "s", "live", null, "")), new ObjectMapper());
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void findsTheApprovedSessionOfThatPerson() {
        listBody = "{\"results\":[{\"session_id\":\"aaa\",\"status\":\"Approved\",\"vendor_data\":\"local-1\"}]}";
        assertEquals(Optional.of("aaa"), client.findApprovedSessionId("local-1"));
        assertTrue(requests.get(0).contains("vendor_data=local-1") && requests.get(0).contains("status=Approved"));
    }

    @Test
    void ignoresRowsOfAnotherPersonOrStatus() {
        listBody = "{\"results\":[{\"session_id\":\"x\",\"status\":\"Approved\",\"vendor_data\":\"prod-1\"},"
                + "{\"session_id\":\"y\",\"status\":\"Declined\",\"vendor_data\":\"local-1\"}]}";
        assertEquals(Optional.empty(), client.findApprovedSessionId("local-1"));
    }

    @Test
    void deleteAllRemovesEverySessionOfThatPerson() {
        listBody = "{\"results\":[{\"session_id\":\"a\",\"status\":\"Approved\",\"vendor_data\":\"local-1\"},"
                + "{\"session_id\":\"b\",\"status\":\"In Progress\",\"vendor_data\":\"local-1\"}]}";
        assertEquals(2, client.deleteAllSessions("local-1"));
        assertTrue(requests.contains("DELETE /v3/session/a/delete/"));
        assertTrue(requests.contains("DELETE /v3/session/b/delete/"));
    }
}
