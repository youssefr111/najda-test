package com.najda.backend.user.dto;

import com.najda.backend.user.model.Allergy;
import com.najda.backend.user.model.BloodType;
import com.najda.backend.user.model.MedicalCondition;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import org.springframework.util.StringUtils;

/** Full replacement of the caller's medical profile; every field is optional. */
public record UpdateMedicalProfileRequest(
        @Past LocalDate dateOfBirth,
        @DecimalMin("1.0") @DecimalMax("500.0") @Digits(integer = 3, fraction = 1) BigDecimal weightKg,
        BloodType bloodType,
        boolean noKnownAllergies,
        Set<Allergy> allergies,
        @Size(max = 500) String allergyNotes,
        boolean noKnownConditions,
        Set<MedicalCondition> conditions,
        @Size(max = 500) String conditionNotes,
        @Size(max = 500) String currentMedications,
        @Size(max = 500) String medicalNotes,
        @Size(max = 3) List<@Valid EmergencyContactDto> emergencyContacts,
        boolean shareWithResponders
) {

    @AssertTrue(message = "allergies and allergyNotes must be empty when noKnownAllergies is true")
    public boolean isAllergyStateConsistent() {
        return !noKnownAllergies || (isEmpty(allergies) && !StringUtils.hasText(allergyNotes));
    }

    @AssertTrue(message = "conditions and conditionNotes must be empty when noKnownConditions is true")
    public boolean isConditionStateConsistent() {
        return !noKnownConditions || (isEmpty(conditions) && !StringUtils.hasText(conditionNotes));
    }

    private static boolean isEmpty(Collection<?> values) {
        return values == null || values.isEmpty();
    }
}