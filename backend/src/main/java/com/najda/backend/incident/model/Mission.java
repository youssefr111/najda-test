package com.najda.backend.incident.model;

import com.najda.backend.unit.model.ResponseUnit;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "missions")
@Getter
@Setter
@NoArgsConstructor
public class Mission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    /** Type of responder is derivable via unit.getUnitType() -- every
        responder, including FIRST_RESPONDER, is now a ResponseUnit. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private ResponseUnit unit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MissionStatus status = MissionStatus.OFFERED;

    @Column(name = "offered_at")
    private LocalDateTime offeredAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @OneToMany(mappedBy = "mission", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MissionParticipant> participants = new ArrayList<>();

    @OneToOne(mappedBy = "mission", cascade = CascadeType.ALL, orphanRemoval = true)
    private HospitalTransfer hospitalTransfer;

    @Version
    private Long version;
}