package com.najda.backend.security.configuration;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.FileInputStream;
import java.io.IOException;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class FirebaseConfig {
    @Value("${FIREBASE_SERVICE_ACCOUNT_PATH}")
    private String serviceAccountPath;

    @PostConstruct
    public void init() throws IOException {
        FileInputStream serviceAccount =
            new FileInputStream(serviceAccountPath);
        FirebaseOptions options = FirebaseOptions.builder()
            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
            .setHttpTransport(new NetHttpTransport())
            .build();
        if (FirebaseApp.getApps().isEmpty()) {
            FirebaseApp.initializeApp(options);
        }
    }
}