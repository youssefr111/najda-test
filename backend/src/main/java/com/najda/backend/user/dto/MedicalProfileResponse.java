package com.najda.backend.user.dto;

import com.najda.backend.user.model.Allergy;
import com.najda.backend.user.model.BloodType;
import com.najda.backend.user.model.MedicalCondition;
import com.najda.backend.user.model.MedicalProfile;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

public record MedicalProfileResponse(
        LocalDate dateOfBirth,
        BigDecimal weightKg,
        BloodType bloodType,
        boolean noKnownAllergies,
        Set<Allergy> allergies,
        String allergyNotes,
        boolean noKnownConditions,
        Set<MedicalCondition> conditions,
        String conditionNotes,
        String currentMedications,
        String medicalNotes,
        List<EmergencyContactDto> emergencyContacts,
        boolean shareWithResponders,
        Instant updatedAt
) {

    /** What a user who hasn't filled anything in yet sees. */
    public static MedicalProfileResponse empty() {
        return new MedicalProfileResponse(
                null, null, null,
                false, Set.of(), null,
                false, Set.of(), null,
                null, null, List.of(),
                false, null);
    }

    /** Must be called inside a transaction -- the collections are lazy. */
    public static MedicalProfileResponse from(MedicalProfile profile) {
        return new MedicalProfileResponse(
                profile.getDateOfBirth(),
                profile.getWeightKg(),
                profile.getBloodType(),
                profile.isNoKnownAllergies(),
                new TreeSet<>(profile.getAllergies()),
                profile.getAllergyNotes(),
                profile.isNoKnownConditions(),
                new TreeSet<>(profile.getConditions()),
                profile.getConditionNotes(),
                profile.getCurrentMedications(),
                profile.getMedicalNotes(),
                profile.getEmergencyContacts().stream()
                        .map(c -> new EmergencyContactDto(c.getName(), c.getRelationship(), c.getPhone()))
                        .toList(),
                profile.isShareWithResponders(),
                profile.getUpdatedAt()
        );
    }
}