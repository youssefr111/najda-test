package com.najda.backend.facility.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "facilities")
@Getter
@Setter
@NoArgsConstructor
public class Facility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String address; // nullable -- meaningful for stations, optional for hospitals

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FacilityType facilityType;

    // True once this facility has real assigned staff/units -- set
    // automatically the moment a HOSPITAL_STAFF user or a Unit gets linked
    // here, never a manual admin toggle for its own sake.
    @Column(nullable = false)
    private boolean registered = false;
}