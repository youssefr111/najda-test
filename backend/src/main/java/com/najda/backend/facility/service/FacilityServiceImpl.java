package com.najda.backend.facility.service;

import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.facility.dto.CreateFacilityRequest;
import com.najda.backend.facility.dto.FacilityResponse;
import com.najda.backend.facility.dto.UpdateFacilityRequest;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.incident.service.ReverseGeocodingService;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class FacilityServiceImpl implements FacilityService {

    private final FacilityRepository facilityRepository;
    private final ReverseGeocodingService reverseGeocodingService;
    private static final Logger log = LoggerFactory.getLogger(FacilityServiceImpl.class);

    public FacilityServiceImpl(FacilityRepository facilityRepository, ReverseGeocodingService reverseGeocodingService) {
        this.facilityRepository = facilityRepository;
        this.reverseGeocodingService = reverseGeocodingService;
    }

    @Override
    public FacilityResponse create(CreateFacilityRequest request) {
        Facility facility = new Facility();
        facility.setName(request.name());
        facility.setAddress(request.address());
        facility.setLatitude(request.latitude());
        facility.setLongitude(request.longitude());
        facility.setFacilityType(request.facilityType());
        facility.setRegistered(false);
        return toResponse(facilityRepository.save(facility));
    }

    @Override
    public FacilityResponse update(Long facilityId, UpdateFacilityRequest request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Facility not found"));
        facility.setName(request.name());
        facility.setAddress(request.address());
        facility.setLatitude(request.latitude());
        facility.setLongitude(request.longitude());
        facility.setFacilityType(request.facilityType());
        return toResponse(facilityRepository.save(facility));
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
    public void markRegistered(Long facilityId) {
        facilityRepository.findById(facilityId).ifPresent(f -> {
            if (!f.isRegistered()) {
                f.setRegistered(true);
                facilityRepository.save(f);
            }
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

    private FacilityResponse toResponse(Facility f) {
        return new FacilityResponse(f.getId(), f.getName(), f.getAddress(), f.getLatitude(), f.getLongitude(), f.getFacilityType(), f.isRegistered());
    }
}