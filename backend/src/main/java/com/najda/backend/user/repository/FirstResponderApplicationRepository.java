package com.najda.backend.user.repository;

import com.najda.backend.user.model.FirstResponderApplication;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FirstResponderApplicationRepository extends JpaRepository<FirstResponderApplication, Long> {
    List<FirstResponderApplication> findByCitizenIdOrderBySubmittedAtDesc(Long citizenId);
    List<FirstResponderApplication> findAllByOrderBySubmittedAtDesc();
}