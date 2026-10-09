package com.najda.backend.incident.model;

import com.najda.backend.facility.model.Facility;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "hospital_transfers")
@Getter
@Setter
@NoArgsConstructor
public class HospitalTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false, unique = true)
    private Mission mission;

    /** Null when the crew picked a hospital outside the system. */
    @ManyToOne
    @JoinColumn(name = "hospital_id")
    private Facility hospital;

    /** Used when hospital is null -- crew's free-text destination name. */
    @Column(name = "destination_name_freetext")
    private String destinationNameFreetext;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HospitalTransferStatus status = HospitalTransferStatus.SELECTED;

    @OneToMany(mappedBy = "hospitalTransfer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PatientVitalsUpdate> vitalsUpdates = new ArrayList<>();
}