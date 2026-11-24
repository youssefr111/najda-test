package com.najda.backend.facility.service;

import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.unit.service.RoleFacilityPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@code Facility.registered} is derived state: a facility is registered while at least one active staff member
 * or non-archived unit is linked to it. {@link FacilityService#refreshRegistered} keeps it right as links change;
 * this heals whatever slipped past that -- rows from before the rule existed, edits made directly in the database --
 * once at startup and again every night.
 */
@Component
public class FacilityRegistrationReconciler {

    private static final Logger log = LoggerFactory.getLogger(FacilityRegistrationReconciler.class);

    private final FacilityRepository facilityRepository;
    private final FacilityEventPublisher facilityEventPublisher;

    public FacilityRegistrationReconciler(FacilityRepository facilityRepository, FacilityEventPublisher facilityEventPublisher) {
        this.facilityRepository = facilityRepository;
        this.facilityEventPublisher = facilityEventPublisher;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "0 45 3 * * *")
    @Transactional
    public void reconcile() {
        var staffRoles = RoleFacilityPolicy.facilityRoleNames();
        int nowRegistered = facilityRepository.markLinkedAsRegistered(staffRoles);
        int nowUnregistered = facilityRepository.markUnlinkedAsUnregistered(staffRoles);

        if (nowRegistered + nowUnregistered > 0) {
            log.info("Facility registration reconciled: {} became registered, {} became unregistered", nowRegistered, nowUnregistered);
            facilityEventPublisher.notifyFacilitiesChanged();
        }
    }
}
