package com.najda.backend.user.model;

import com.najda.backend.incident.model.MessageContentConverter;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A user's optional medical details. Strictly one per user, so the user's id
 * is also this table's primary key. Kept out of {@link User} because that
 * entity is loaded on every authenticated request and this data is sensitive.
 *
 * Structured fields (blood type, allergies, conditions) are closed enums and
 * stay queryable; free text and the emergency contacts are encrypted at rest,
 * like chat and vitals notes.
 *
 * "No known allergies" / "no known conditions" are explicit statements: an
 * empty list alone means "nothing provided", which is not the same thing.
 */
@Entity
@Table(name = "medical_profiles")
@Getter
@Setter
@NoArgsConstructor
public class MedicalProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "weight_kg", precision = 5, scale = 1)
    private BigDecimal weightKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "blood_type", length = 20)
    private BloodType bloodType;

    @Column(name = "no_known_allergies", nullable = false)
    private boolean noKnownAllergies;

    @ElementCollection
    @CollectionTable(name = "medical_profile_allergies", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "allergy", nullable = false, length = 30)
    private Set<Allergy> allergies = new HashSet<>();

    /** Other allergies, and the reaction/severity (e.g. "Penicillin - anaphylaxis"). */
    @Convert(converter = MessageContentConverter.class)
    @Column(name = "allergy_notes", columnDefinition = "TEXT")
    private String allergyNotes;

    @Column(name = "no_known_conditions", nullable = false)
    private boolean noKnownConditions;

    @ElementCollection
    @CollectionTable(name = "medical_profile_conditions", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "medical_condition", nullable = false, length = 30)
    private Set<MedicalCondition> conditions = new HashSet<>();

    @Convert(converter = MessageContentConverter.class)
    @Column(name = "condition_notes", columnDefinition = "TEXT")
    private String conditionNotes;

    @Convert(converter = MessageContentConverter.class)
    @Column(name = "current_medications", columnDefinition = "TEXT")
    private String currentMedications;

    /** Anything else a responder should know: implants, disabilities, wishes about treatment... */
    @Convert(converter = MessageContentConverter.class)
    @Column(name = "medical_notes", columnDefinition = "TEXT")
    private String medicalNotes;

    /** Ordered: the first contact is the primary one. */
    @ElementCollection
    @CollectionTable(name = "medical_profile_emergency_contacts", joinColumns = @JoinColumn(name = "user_id"))
    @OrderColumn(name = "sort_order")
    private List<EmergencyContact> emergencyContacts = new ArrayList<>();

    /** Standing consent for responders to see this profile when the user reports an emergency. Revocable any time. */
    @Column(name = "share_with_responders", nullable = false)
    private boolean shareWithResponders;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public MedicalProfile(Long userId) {
        this.userId = userId;
    }
}