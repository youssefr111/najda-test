package com.najda.backend.unit.model;

import com.najda.backend.facility.model.Facility;
import com.najda.backend.user.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


/**
 * Represents any dispatchable unit -- a physical vehicle
 * (AMBULANCE/FIRE_TRUCK/POLICE_CAR) or a single individual
 * (FIRST_RESPONDER, who has no plate number or home station). Named
 * ResponseUnit rather than "Vehicle" specifically because of this
 * generalization: every responder type shares the exact same
 * ShiftAssignment/Mission/status lifecycle, which would otherwise need to
 * be duplicated or special-cased per type.
 */
@Entity
@Table(name = "response_units")
@Getter
@Setter
@NoArgsConstructor
public class ResponseUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null for FIRST_RESPONDER units -- a person has no plate number. */
    @Column(name = "plate_number", unique = true)
    private String plateNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_type", nullable = false)
    private UnitType unitType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UnitStatus status = UnitStatus.OFFLINE;

    /** Null for FIRST_RESPONDER units -- a person has no home facility. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id")
    private Facility facility;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @ManyToOne
    @JoinColumn(name = "assigned_employee_id")
    private User assignedEmployee;
}