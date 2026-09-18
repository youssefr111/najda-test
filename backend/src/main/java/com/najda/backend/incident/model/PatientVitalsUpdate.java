package com.najda.backend.incident.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "patient_vitals_updates")
@Getter
@Setter
@NoArgsConstructor
public class PatientVitalsUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_transfer_id", nullable = false)
    private HospitalTransfer hospitalTransfer;

    /** Beats per minute. */
    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "blood_pressure_systolic")
    private Integer bloodPressureSystolic;

    @Column(name = "blood_pressure_diastolic")
    private Integer bloodPressureDiastolic;

    /** Blood oxygen saturation, percentage. */
    @Column(name = "spo2")
    private Integer spo2;

    /** Breaths per minute. */
    @Column(name = "respiratory_rate")
    private Integer respiratoryRate;

    @Column(name = "temperature_celsius")
    private Double temperatureCelsius;

    @Enumerated(EnumType.STRING)
    @Column(name = "consciousness_level")
    private ConsciousnessLevel consciousnessLevel;

    @Convert(converter = MessageContentConverter.class)
    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "recorded_at", nullable = false, updatable = false)
    private LocalDateTime recordedAt;
}