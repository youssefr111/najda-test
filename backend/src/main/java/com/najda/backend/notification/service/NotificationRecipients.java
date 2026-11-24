package com.najda.backend.notification.service;

import com.najda.backend.incident.model.MissionStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.Collection;
import java.util.List;
import org.springframework.stereotype.Component;

/** Resolves "who should hear about this" into user ids. */
@Component
public class NotificationRecipients {

    private static final List<String> DISPATCH_ROLES = List.of("DISPATCHER");
    private static final List<String> ADMIN_ROLES = List.of("ADMIN", "SUPER_ADMIN");
    private static final List<MissionStatus> LIVE_MISSION_STATUSES =
            List.of(MissionStatus.OFFERED, MissionStatus.ACCEPTED, MissionStatus.EN_ROUTE, MissionStatus.ARRIVED);

    @PersistenceContext
    private EntityManager em;

    /** Dispatchers */
    public List<Long> dispatchers() {
        return usersWithRoles(DISPATCH_ROLES);
    }

    public List<Long> admins() {
        return usersWithRoles(ADMIN_ROLES);
    }

    /** Every active account: used when something affects everyone (e.g. updated legal terms). */
    public List<Long> allActiveUsers() {
        return em.createQuery("select u.id from User u where u.enabled = true and u.deletedAt is null", Long.class)
                .getResultList();
    }

    public List<Long> hospitalStaff(Long facilityId) {
        if (facilityId == null) return List.of();
        return em.createQuery("""
                        select u.id from User u
                        where u.enabled = true and u.deletedAt is null
                          and upper(u.role.roleName) in ('HOSPITAL_STAFF', 'FACILITY_MANAGER')
                          and u.facility.id = :facilityId
                        """, Long.class)
                .setParameter("facilityId", facilityId)
                .getResultList();
    }

    /** Everyone crewing this mission's unit. */
    public List<Long> missionCrew(Long missionId) {
        return em.createQuery("select p.user.id from MissionParticipant p where p.mission.id = :missionId", Long.class)
                .setParameter("missionId", missionId)
                .getResultList();
    }

    /** Crew of every mission on the incident that has not finished or been turned down. */
    public List<Long> liveCrew(Long incidentId) {
        return em.createQuery("""
                        select distinct p.user.id from MissionParticipant p
                        where p.mission.incident.id = :incidentId
                          and p.mission.status in :statuses
                        """, Long.class)
                .setParameter("incidentId", incidentId)
                .setParameter("statuses", LIVE_MISSION_STATUSES)
                .getResultList();
    }

    private List<Long> usersWithRoles(Collection<String> roles) {
        return em.createQuery("""
                        select u.id from User u
                        where u.enabled = true and u.deletedAt is null
                          and upper(u.role.roleName) in :roles
                        """, Long.class)
                .setParameter("roles", roles)
                .getResultList();
    }
}
