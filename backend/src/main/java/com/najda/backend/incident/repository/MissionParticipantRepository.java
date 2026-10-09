package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.MissionParticipant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MissionParticipantRepository extends JpaRepository<MissionParticipant, Long> {
    List<MissionParticipant> findByMissionId(Long missionId);
    List<MissionParticipant> findByUserId(Long userId);
}