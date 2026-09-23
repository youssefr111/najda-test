package com.najda.backend.user.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "first_responder_application_documents")
@Getter
@Setter
@NoArgsConstructor
public class FirstResponderApplicationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "application_id", nullable = false)
    private FirstResponderApplication application;

    @Column(nullable = false)
    private String storagePath;

    private String originalFileName;

    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();
}