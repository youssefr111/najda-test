package com.najda.backend.user.service;

import com.najda.backend.user.dto.EmergencyContactDto;
import com.najda.backend.user.dto.MedicalProfileResponse;
import com.najda.backend.user.dto.UpdateMedicalProfileRequest;
import com.najda.backend.user.model.EmergencyContact;
import com.najda.backend.user.model.MedicalProfile;
import com.najda.backend.user.repository.MedicalProfileRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class MedicalProfileServiceImpl implements MedicalProfileService {

    private final MedicalProfileRepository medicalProfileRepository;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public MedicalProfileResponse getProfile(Long userId) {
        return medicalProfileRepository.findById(userId)
                .map(MedicalProfileResponse::from)
                .orElseGet(MedicalProfileResponse::empty);
    }

    @Override
    @Transactional
    public MedicalProfileResponse saveProfile(Long userId, UpdateMedicalProfileRequest request) {
        MedicalProfile profile = medicalProfileRepository.findById(userId)
                .orElseGet(() -> new MedicalProfile(userId));

        profile.setDateOfBirth(request.dateOfBirth());
        profile.setWeightKg(request.weightKg());
        profile.setBloodType(request.bloodType());

        profile.setNoKnownAllergies(request.noKnownAllergies());
        replaceContents(profile.getAllergies(), request.allergies());
        profile.setAllergyNotes(trimToNull(request.allergyNotes()));

        profile.setNoKnownConditions(request.noKnownConditions());
        replaceContents(profile.getConditions(), request.conditions());
        profile.setConditionNotes(trimToNull(request.conditionNotes()));

        profile.setCurrentMedications(trimToNull(request.currentMedications()));
        profile.setMedicalNotes(trimToNull(request.medicalNotes()));
        replaceContacts(profile.getEmergencyContacts(), request.emergencyContacts());

        profile.setShareWithResponders(request.shareWithResponders());
        // Set explicitly: a change to only a collection doesn't mark the row dirty,
        // so an @UpdateTimestamp wouldn't fire.
        profile.setUpdatedAt(Instant.now(clock));

        return MedicalProfileResponse.from(medicalProfileRepository.save(profile));
    }

    @Override
    @Transactional
    public void deleteProfile(Long userId) {
        medicalProfileRepository.deleteById(userId);
    }

    @SuppressWarnings("null")
    @Override
    @Transactional(readOnly = true)
    public boolean sharesWithResponders(Long userId) {
        return medicalProfileRepository.findById(userId)
                .map(MedicalProfile::isShareWithResponders)
                .orElse(false);
    }

    private static <T> void replaceContents(Set<T> target, Set<T> replacement) {
        target.clear();
        if (replacement != null) {
            target.addAll(replacement);
        }
    }

    private static void replaceContacts(List<EmergencyContact> target, List<EmergencyContactDto> replacement) {
        target.clear();
        if (replacement != null) {
            replacement.forEach(dto ->
                    target.add(new EmergencyContact(dto.name().trim(), dto.phone(), dto.relationship())));
        }
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}