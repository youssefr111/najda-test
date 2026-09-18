package com.najda.backend.user.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "first_responder_applications")
@Getter
@Setter
@NoArgsConstructor
public class FirstResponderApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "citizen_id", nullable = false)
    private User citizen;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String motivation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    private LocalDateTime reviewedAt;
    private Long reviewedBy;
    private String reviewNotes;
}