package com.najda.backend.facility.service;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.facility.dto.FacilityTypeChangeImpact;
import com.najda.backend.facility.dto.FacilityTypeChangeImpact.UnitConversion;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.incident.repository.HospitalTransferRepository;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.unit.repository.ShiftAssignmentRepository;
import com.najda.backend.unit.service.RoleFacilityPolicy;
import com.najda.backend.unit.service.UnitEventPublisher;
import com.najda.backend.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * A facility's type decides which staff may be linked to it and which units may be based there, and the
 * database enforces neither. This assesses, and carries out, a type change without stranding anyone:
 * <ul>
 *   <li>staff that no longer fit block the change -- a role carries permissions, so it is never converted;</li>
 *   <li>idle units that no longer fit are relabelled to the new type, but only once the admin confirmed it;</li>
 *   <li>units on a mission or on shift, and in-progress patient transfers to a hospital, block the change.</li>
 * </ul>
 * An ambulance fits both a hospital and an ambulance station, so switching between those two changes no unit.
 */
@Service
class FacilityTypeChangeService {

    /** Where each unit type may be based. A unit type missing here (FIRST_RESPONDER) has no home facility. */
    private static final Map<UnitType, Set<FacilityType>> UNIT_HOMES = Map.of(
            UnitType.AMBULANCE, EnumSet.of(FacilityType.AMBULANCE_STATION, FacilityType.HOSPITAL),
            UnitType.FIRE_TRUCK, EnumSet.of(FacilityType.FIRE_STATION),
            UnitType.POLICE_CAR, EnumSet.of(FacilityType.POLICE_STATION)
    );

    /** The unit type a facility of each type hosts -- what a misfit unit is relabelled to. */
    private static final Map<FacilityType, UnitType> HOSTED_UNIT = Map.of(
            FacilityType.HOSPITAL, UnitType.AMBULANCE,
            FacilityType.AMBULANCE_STATION, UnitType.AMBULANCE,
            FacilityType.FIRE_STATION, UnitType.FIRE_TRUCK,
            FacilityType.POLICE_STATION, UnitType.POLICE_CAR
    );

    private record Assessment(FacilityTypeChangeImpact impact, List<ResponseUnit> unitsToConvert) {}

    private final UserRepository userRepository;
    private final ResponseUnitRepository responseUnitRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final HospitalTransferRepository hospitalTransferRepository;
    private final UnitEventPublisher unitEventPublisher;

    FacilityTypeChangeService(UserRepository userRepository,
                              ResponseUnitRepository responseUnitRepository,
                              ShiftAssignmentRepository shiftAssignmentRepository,
                              HospitalTransferRepository hospitalTransferRepository,
                              UnitEventPublisher unitEventPublisher) {
        this.userRepository = userRepository;
        this.responseUnitRepository = responseUnitRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.hospitalTransferRepository = hospitalTransferRepository;
        this.unitEventPublisher = unitEventPublisher;
    }

    FacilityTypeChangeImpact assess(Facility facility, FacilityType newType) {
        return assessment(facility, newType).impact();
    }

    /**
     * Validates the change and relabels the units that need it, in the caller's transaction.
     *
     * @throws ConflictException if something blocks the change, or units need converting and {@code convertUnits} is false
     */
    void apply(Facility facility, FacilityType newType, boolean convertUnits) {
        Assessment assessment = assessment(facility, newType);
        FacilityTypeChangeImpact impact = assessment.impact();

        if (!impact.canProceed()) {
            throw new ConflictException(blockedMessage(newType, impact));
        }
        if (assessment.unitsToConvert().isEmpty()) {
            return;
        }
        if (!convertUnits) {
            throw new ConflictException("Changing this facility to " + label(newType) + " also converts "
                    + assessment.unitsToConvert().size() + " unit(s). Confirm the conversion to continue.");
        }

        UnitType target = HOSTED_UNIT.get(newType);
        assessment.unitsToConvert().forEach(unit -> unit.setUnitType(target));
        responseUnitRepository.saveAll(assessment.unitsToConvert());
        unitEventPublisher.notifyUnitsChanged();
    }

    @SuppressWarnings("null")
    private Assessment assessment(Facility facility, FacilityType newType) {
        long blockingStaff = userRepository.findManagedStaff(facility.getId()).stream()
                .map(user -> user.getRole().getRoleName())
                .filter(RoleFacilityPolicy::allowsFacility)
                .filter(role -> !RoleFacilityPolicy.expectedTypes(role).contains(newType))
                .count();

        List<ResponseUnit> unitsToConvert = responseUnitRepository.findByFacilityIdAndArchivedAtIsNull(facility.getId()).stream()
                .filter(unit -> UNIT_HOMES.containsKey(unit.getUnitType()))
                .filter(unit -> !UNIT_HOMES.get(unit.getUnitType()).contains(newType))
                .toList();

        long blockingUnits = unitsToConvert.stream().filter(this::isInUse).count();

        boolean leavingHospital = facility.getFacilityType() == FacilityType.HOSPITAL && newType != FacilityType.HOSPITAL;
        boolean blockedByTransfers = leavingHospital
                && hospitalTransferRepository.existsActiveTransferToHospital(facility.getId(), MissionStatus.FIELD_ACTIVE);

        UnitType target = HOSTED_UNIT.get(newType);
        List<UnitConversion> conversions = unitsToConvert.stream()
                .collect(Collectors.groupingBy(ResponseUnit::getUnitType, () -> new EnumMap<>(UnitType.class), Collectors.counting()))
                .entrySet().stream()
                .map(entry -> new UnitConversion(entry.getKey(), target, entry.getValue().intValue()))
                .toList();

        boolean canProceed = blockingStaff == 0 && blockingUnits == 0 && !blockedByTransfers;
        return new Assessment(
                new FacilityTypeChangeImpact(conversions, (int) blockingStaff, (int) blockingUnits, blockedByTransfers, canProceed),
                unitsToConvert);
    }

    private boolean isInUse(ResponseUnit unit) {
        return unit.getStatus() == UnitStatus.BUSY
                || !shiftAssignmentRepository.findByUnitIdAndEndTimeIsNull(unit.getId()).isEmpty();
    }

    private static String blockedMessage(FacilityType newType, FacilityTypeChangeImpact impact) {
        List<String> reasons = new ArrayList<>();
        if (impact.blockingStaff() > 0) {
            reasons.add(impact.blockingStaff() + " linked staff member(s) have roles that don't fit it -- reassign them first");
        }
        if (impact.blockingUnits() > 0) {
            reasons.add(impact.blockingUnits() + " unit(s) that would need converting are on a mission or on shift");
        }
        if (impact.blockedByActiveTransfers()) {
            reasons.add("patients are still being transferred to this hospital");
        }
        return "Can't change this facility to " + label(newType) + ": " + String.join("; ", reasons) + ".";
    }

    private static String label(FacilityType type) {
        return type.name().replace('_', ' ').toLowerCase();
    }
}
