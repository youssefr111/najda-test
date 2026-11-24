package com.najda.backend.incident.service;

import com.najda.backend.incident.model.Mission;
import com.najda.backend.incident.model.MissionParticipant;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.incident.repository.MissionParticipantRepository;
import com.najda.backend.incident.repository.MissionRepository;
import com.najda.backend.unit.model.ShiftAssignment;
import com.najda.backend.unit.repository.ShiftAssignmentRepository;
import com.najda.backend.user.model.User;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps a mission's participants in step with the crew that is actually on the unit.
 *
 * <p>Participants are first written when the dispatcher offers the mission (everyone on the unit's shift then,
 * so the offer reaches them). The crew can change after that, so:
 * <ul>
 *   <li>when the lead <b>accepts</b>, the participants are reconciled with the crew on the unit at that moment:
 *       people who left before it was accepted never took the mission and drop out, people who joined are added;</li>
 *   <li>when someone <b>joins</b> the unit, they become a participant of every mission the unit has open;</li>
 *   <li>when someone <b>leaves</b>, they drop out of missions still only <i>offered</i>; once a mission was accepted
 *       they stay, so they can still look back at what they worked on.</li>
 * </ul>
 * Every method must run inside the caller's transaction. They only touch participant rows (through the repository,
 * like the assignment code), never the {@code Mission.participants} collection.
 */
@Component
public class MissionCrewSync {

    /** Missions a unit's crew can be working on: offered, or accepted and not yet finished. */
    private static final Set<MissionStatus> OPEN =
            EnumSet.of(MissionStatus.OFFERED, MissionStatus.ACCEPTED, MissionStatus.EN_ROUTE, MissionStatus.ARRIVED);

    private static final Set<MissionStatus> NOT_YET_ACCEPTED = EnumSet.of(MissionStatus.OFFERED);

    private final MissionRepository missionRepository;
    private final MissionParticipantRepository participantRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;

    public MissionCrewSync(
            MissionRepository missionRepository,
            MissionParticipantRepository participantRepository,
            ShiftAssignmentRepository shiftAssignmentRepository) {
        this.missionRepository = missionRepository;
        this.participantRepository = participantRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
    }

    /** The lead accepted: from here the participants are the people who actually took the mission. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void reconcileOnAccept(Mission mission) {
        Map<Long, User> crew = new LinkedHashMap<>();
        for (ShiftAssignment shift : shiftAssignmentRepository.findByUnitIdAndEndTimeIsNull(mission.getUnit().getId())) {
            crew.putIfAbsent(shift.getEmployee().getId(), shift.getEmployee());
        }

        List<MissionParticipant> current = participantRepository.findByMissionId(mission.getId());
        Plan plan = plan(current.stream().map(p -> p.getUser().getId()).toList(), crew.keySet());

        for (int row : plan.deleteRows()) {
            participantRepository.delete(current.get(row));
        }
        for (Long userId : plan.addUsers()) {
            add(mission, crew.get(userId));
        }
    }

    /** Someone joined the unit's shift: they are part of every mission the unit has open. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void crewJoined(Long unitId, User user) {
        for (Mission mission : missionRepository.findByUnitIdAndStatusIn(unitId, OPEN)) {
            boolean alreadyIn = participantRepository.findByMissionId(mission.getId()).stream()
                    .anyMatch(p -> p.getUser().getId().equals(user.getId()));
            if (!alreadyIn) {
                add(mission, user);
            }
        }
    }

    /** Someone left the unit's shift: they drop out of offers that were never accepted; accepted missions keep them. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void crewLeft(Long unitId, Long userId) {
        for (Mission mission : missionRepository.findByUnitIdAndStatusIn(unitId, NOT_YET_ACCEPTED)) {
            participantRepository.findByMissionId(mission.getId()).stream()
                    .filter(p -> p.getUser().getId().equals(userId))
                    .forEach(participantRepository::delete);
        }
    }

    private void add(Mission mission, User user) {
        MissionParticipant participant = new MissionParticipant();
        participant.setMission(mission);
        participant.setUser(user);
        participantRepository.save(participant);
    }

    /**
     * What has to change so the participants match the crew: the rows to delete (indexes into the current list --
     * someone who is no longer on the crew, and any duplicate row of someone who is) and the users to add.
     */
    public record Plan(List<Integer> deleteRows, List<Long> addUsers) {}

    public static Plan plan(List<Long> currentUserIds, Collection<Long> crewIds) {
        Set<Long> kept = new HashSet<>();
        List<Integer> deleteRows = new ArrayList<>();
        for (int i = 0; i < currentUserIds.size(); i++) {
            Long userId = currentUserIds.get(i);
            if (!crewIds.contains(userId) || !kept.add(userId)) {
                deleteRows.add(i);
            }
        }
        List<Long> addUsers = crewIds.stream().filter(id -> !kept.contains(id)).toList();
        return new Plan(deleteRows, addUsers);
    }
}