package com.najda.backend.hospital.service;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.hospital.dto.IncomingTransferResponse;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.incident.model.HospitalTransfer;
import com.najda.backend.incident.model.HospitalTransferStatus;
import com.najda.backend.incident.repository.HospitalTransferRepository;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class HospitalDashboardServiceImpl implements HospitalDashboardService {

    private static final Set<HospitalTransferStatus> INCOMING_STATUSES =
            EnumSet.of(HospitalTransferStatus.SELECTED, HospitalTransferStatus.EN_ROUTE);

    private final UserRepository userRepository;
    private final HospitalTransferRepository hospitalTransferRepository;

    public HospitalDashboardServiceImpl(
            UserRepository userRepository,
            HospitalTransferRepository hospitalTransferRepository) {
        this.userRepository = userRepository;
        this.hospitalTransferRepository = hospitalTransferRepository;
    }

    @Override
    public List<IncomingTransferResponse> getIncomingTransfers(Long staffUserId) {
        Facility facility = requireStaffFacility(staffUserId);

        return hospitalTransferRepository.findByHospitalIdOrderByIdDesc(facility.getId()).stream()
                .filter(t -> INCOMING_STATUSES.contains(t.getStatus()))
                .map(this::toIncomingResponse)
                .toList();
    }
    
    /** Every dashboard action is scoped to the caller's own hospital --
        this is the one check every method here relies on. */
    private Facility requireStaffFacility(Long staffUserId) {
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (staff.getFacility() == null) {
            throw new ConflictException("This account is not linked to a facility");
        }

        return staff.getFacility();
    }

    private IncomingTransferResponse toIncomingResponse(HospitalTransfer transfer) {
        ResponseUnit unit = transfer.getMission().getUnit();
        return new IncomingTransferResponse(
                transfer.getId(), transfer.getMission().getId(), transfer.getMission().getIncident().getId(), transfer.getStatus(),
                unit.getUnitType(), unit.getLatitude(), unit.getLongitude(),
                unit.getFacility() != null ? unit.getFacility().getLatitude() : null,
                unit.getFacility() != null ? unit.getFacility().getLongitude() : null
        );
    }
}