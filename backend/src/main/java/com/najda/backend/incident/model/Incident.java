package com.najda.backend.incident.model;

import com.najda.backend.user.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "incidents")
@Getter
@Setter
@NoArgsConstructor
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citizen_id", nullable = false)
    private User citizen;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentCategory category;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "location_source", nullable = false)
    private LocationSource locationSource;

    private String address;

    @Column(nullable = false)
    private Integer injuredCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentStatus status = IncidentStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentSource source = IncidentSource.CITIZEN_APP;

    @ManyToOne
    @JoinColumn(name = "duplicate_of_incident_id")
    private Incident duplicateOf;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_priority")
    private AiPriority aiPriority;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @ManyToOne
    @JoinColumn(name = "ai_suggested_duplicate_of_id")
    private Incident aiSuggestedDuplicateOf;

    private Double aiDuplicateConfidence;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by")
    private User cancelledBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @OneToMany(mappedBy = "incident", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<IncidentMedia> media = new ArrayList<>();

    @OneToMany(mappedBy = "incident")
    private List<Mission> missions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Version
    private Long version;
}