package com.najda.backend.user.repository;

import com.najda.backend.user.model.MedicalProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicalProfileRepository extends JpaRepository<MedicalProfile, Long> {
}