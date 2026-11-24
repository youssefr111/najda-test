package com.najda.backend.facility.service;

import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.facility.dto.CreateFacilityRequest;
import com.najda.backend.facility.dto.FacilityResponse;
import com.najda.backend.facility.dto.FacilityTypeChangeImpact;
import com.najda.backend.facility.dto.UpdateFacilityRequest;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.geo.EgyptBoundary;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.unit.service.RoleFacilityPolicy;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.incident.service.ReverseGeocodingService;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class FacilityServiceImpl implements FacilityService {

    private final FacilityRepository facilityRepository;
    private final ReverseGeocodingService reverseGeocodingService;
    private final EgyptBoundary egyptBoundary;
    private final FacilityTypeChangeService typeChangeService;
    private final UserRepository userRepository;
    private final ResponseUnitRepository responseUnitRepository;
    private final FacilityEventPublisher facilityEventPublisher;
    private static final String FACILITY_LOCATION = "The facility location";
    private static final Logger log = LoggerFactory.getLogger(FacilityServiceImpl.class);

    public FacilityServiceImpl(FacilityRepository facilityRepository,
                               ReverseGeocodingService reverseGeocodingService,
                               EgyptBoundary egyptBoundary,
                               FacilityTypeChangeService typeChangeService,
                               UserRepository userRepository,
                               ResponseUnitRepository responseUnitRepository,
                               FacilityEventPublisher facilityEventPublisher) {
        this.facilityRepository = facilityRepository;
        this.reverseGeocodingService = reverseGeocodingService;
        this.egyptBoundary = egyptBoundary;
        this.typeChangeService = typeChangeService;
        this.userRepository = userRepository;
        this.responseUnitRepository = responseUnitRepository;
        this.facilityEventPublisher = facilityEventPublisher;
    }

    @Override
    public FacilityResponse create(CreateFacilityRequest request) {
        egyptBoundary.requireInside(request.latitude(), request.longitude(), FACILITY_LOCATION);

        // Resolved before the insert, so the facility is written once and already has its address.
        String address = isBlank(request.address())
                ? reverseGeocodeQuietly(request.latitude(), request.longitude()).orElse(null)
                : request.address();

        Facility facility = new Facility();
        facility.setName(request.name());
        facility.setAddress(address);
        facility.setLatitude(request.latitude());
        facility.setLongitude(request.longitude());
        facility.setFacilityType(request.facilityType());
        facility.setRegistered(false);
        FacilityResponse created = toResponse(facilityRepository.save(facility));
        facilityEventPublisher.notifyFacilitiesChanged();
        return created;
    }

    @Override
    @Transactional
    public FacilityResponse update(Long facilityId, UpdateFacilityRequest request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found"));

        // Only a moved pin is re-checked: renaming a seeded facility that sits near the (simplified) border must still work.
        boolean moved = !Objects.equals(facility.getLatitude(), request.latitude())
                || !Objects.equals(facility.getLongitude(), request.longitude());
        if (moved) {
            egyptBoundary.requireInside(request.latitude(), request.longitude(), FACILITY_LOCATION);
        }
        if (request.facilityType() != facility.getFacilityType()) {
            typeChangeService.apply(facility, request.facilityType(), Boolean.TRUE.equals(request.convertUnits()));
        }

        facility.setName(request.name());
        facility.setAddress(request.address());
        facility.setLatitude(request.latitude());
        facility.setLongitude(request.longitude());
        facility.setFacilityType(request.facilityType());
        FacilityResponse updated = toResponse(facilityRepository.save(facility));
        facilityEventPublisher.notifyFacilitiesChanged();
        return updated;
    }

    @Override
    @Transactional(readOnly = true)
    public FacilityTypeChangeImpact typeChangeImpact(Long facilityId, FacilityType newType) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found"));
        return typeChangeService.assess(facility, newType);
    }

    @Override
    public List<FacilityResponse> getAll() {
        return facilityRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    public List<FacilityResponse> getByType(FacilityType type) {
        return facilityRepository.findByFacilityType(type).stream().map(this::toResponse).toList();
    }

    @Override
    public org.springframework.data.domain.Page<FacilityResponse> search(
            FacilityType type, String q, org.springframework.data.domain.Pageable pageable) {
        String needle = (q == null || q.isBlank()) ? null : q.trim().toLowerCase();
        return facilityRepository.search(type, needle, pageable).map(this::toResponse);
    }

    @Override
    public void refreshRegistered(Long facilityId) {
        if (facilityId == null) return;

        facilityRepository.findById(facilityId).ifPresent(facility -> {
            boolean linked = userRepository.existsActiveStaff(facilityId, RoleFacilityPolicy.facilityRoleNames())
                    || responseUnitRepository.existsByFacilityIdAndArchivedAtIsNull(facilityId);
            if (facility.isRegistered() == linked) return;

            facility.setRegistered(linked);
            facilityRepository.save(facility);
            facilityEventPublisher.notifyFacilitiesChanged();
        });
    }

    @Override
    public void requireFacilityOfType(Long facilityId, FacilityType... allowed) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found"));
        if (!Arrays.asList(allowed).contains(facility.getFacilityType())) {
            throw new IllegalArgumentException(
                    "Facility " + facilityId + " is a " + facility.getFacilityType() + ", not one of " + Arrays.toString(allowed));
        }
    }

    @Override
    public void backfillMissingAddresses() {
        List<Facility> missing = facilityRepository.findAll().stream()
                .filter(f -> f.getAddress() == null || f.getAddress().isBlank())
                .toList();

        for (Facility facility : missing) {
            try {
                Thread.sleep(1100);
                reverseGeocodingService.reverseGeocode(facility.getLatitude(), facility.getLongitude())
                        .ifPresent(address -> {
                            facility.setAddress(address);
                            facilityRepository.save(facility);
                        });
            } catch (ReverseGeocodingService.RateLimitedException e) {
                log.warn("Nominatim rate-limited during address backfill -- stopping early. Try again later.");
                break;
            } catch (Exception e) {
                log.warn("Address backfill failed for facility {}: {}", facility.getId(), e.getMessage());
            }
        }
    }

    /** Best effort: the address is optional, so a geocoder outage or rate limit must never stop a facility from being created. */
    private Optional<String> reverseGeocodeQuietly(double latitude, double longitude) {
        try {
            return reverseGeocodingService.reverseGeocode(latitude, longitude);
        } catch (ReverseGeocodingService.RateLimitedException e) {
            log.warn("Nominatim rate-limited -- facility created without an address; the address backfill can fill it in later.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.warn("Reverse geocoding failed for a new facility at ({}, {}): {}", latitude, longitude, e.getMessage());
        }
        return Optional.empty();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private FacilityResponse toResponse(Facility f) {
        return new FacilityResponse(f.getId(), f.getName(), f.getAddress(), f.getLatitude(), f.getLongitude(), f.getFacilityType(), f.isRegistered());
    }
}