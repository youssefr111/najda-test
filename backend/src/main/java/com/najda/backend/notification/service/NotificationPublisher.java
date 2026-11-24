package com.najda.backend.notification.service;

import com.najda.backend.incident.model.HospitalTransfer;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.Mission;
import com.najda.backend.notification.model.NotificationType;
import com.najda.backend.user.model.FirstResponderApplication;
import com.najda.backend.user.model.User;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

/**
 * The one door through which business code asks for notifications. Each method
 * names a business moment ("a mission was offered"); who is told, and what they
 * are told, is decided here -- never at the call site.
 *
 * Call these from inside the transaction that makes the change; delivery
 * happens after it commits (see {@link NotificationDispatcher}).
 */
@Service
public class NotificationPublisher {

    private final ApplicationEventPublisher events;
    private final NotificationRecipients recipients;

    public NotificationPublisher(ApplicationEventPublisher events, NotificationRecipients recipients) {
        this.events = events;
        this.recipients = recipients;
    }

    // ---- incidents -------------------------------------------------------------

    /** A new report: dispatch needs to see it right away. */
    public void incidentSubmitted(Incident incident) {
        send(recipients.dispatchers(), null, NotificationType.INCIDENT_NEW, incidentParams(incident), incident, null);
    }

    public void incidentCancelledByCitizen(Incident incident) {
        Set<Long> audience = new LinkedHashSet<>(recipients.dispatchers());
        audience.addAll(recipients.liveCrew(incident.getId()));
        send(audience, incident.getCitizen().getId(), NotificationType.INCIDENT_CANCELLED_BY_CITIZEN,
                incidentParams(incident), incident, null);
    }

    public void incidentResolved(Incident incident) {
        send(List.of(incident.getCitizen().getId()), null, NotificationType.INCIDENT_RESOLVED,
                incidentParams(incident), incident, null);
    }

    public void incidentClosedAsFalseReport(Incident incident) {
        send(List.of(incident.getCitizen().getId()), null, NotificationType.INCIDENT_CLOSED_FALSE_REPORT,
                incidentParams(incident), incident, null);
    }

    public void incidentClosedAsDuplicate(Incident incident) {
        send(List.of(incident.getCitizen().getId()), null, NotificationType.INCIDENT_CLOSED_DUPLICATE,
                incidentParams(incident), incident, null);
    }

    // ---- missions --------------------------------------------------------------

    /** The crew's phones must ring: a mission has been offered to their unit. */
    public void missionOffered(Mission mission) {
        send(recipients.missionCrew(mission.getId()), null, NotificationType.MISSION_OFFERED,
                missionParams(mission), mission.getIncident(), mission);
    }

    public void missionCancelled(Mission mission) {
        send(recipients.missionCrew(mission.getId()), null, NotificationType.MISSION_CANCELLED,
                missionParams(mission), mission.getIncident(), mission);
    }

    /** A unit turned the mission down: dispatch must assign another one. */
    public void missionRejected(Mission mission, Long actorId) {
        send(recipients.dispatchers(), actorId, NotificationType.MISSION_REJECTED,
                missionParams(mission), mission.getIncident(), mission);
    }

    public void missionWithdrawn(Mission mission, Long actorId) {
        send(recipients.dispatchers(), actorId, NotificationType.MISSION_WITHDRAWN,
                missionParams(mission), mission.getIncident(), mission);
    }

    public void missionAccepted(Mission mission) {
        toCitizen(mission, NotificationType.INCIDENT_ACCEPTED);
    }

    public void missionEnRoute(Mission mission) {
        toCitizen(mission, NotificationType.INCIDENT_EN_ROUTE);
    }

    public void missionArrived(Mission mission) {
        toCitizen(mission, NotificationType.INCIDENT_ARRIVED);
    }

    // ---- chat ------------------------------------------------------------------

    /**
     * A message in an incident's chat. From the citizen it goes to the responders
     * and dispatch; from anyone else it goes to the citizen. The text itself is
     * never put in the notification: a lock screen is not the place for it.
     */
    public void chatMessage(Incident incident, User sender) {
        Long citizenId = incident.getCitizen().getId();
        Set<Long> audience = new LinkedHashSet<>();
        if (sender.getId().equals(citizenId)) {
            audience.addAll(recipients.liveCrew(incident.getId()));
            audience.addAll(recipients.dispatchers());
        } else {
            audience.add(citizenId);
        }

        Map<String, String> params = incidentParams(incident);
        params.put("sender", sender.getFirstName());
        send(audience, sender.getId(), NotificationType.CHAT_MESSAGE, params, incident, null);
    }

    // ---- responder applications --------------------------------------------------

    public void applicationSubmitted(FirstResponderApplication application) {
        Map<String, String> params = new HashMap<>();
        params.put("sender", application.getCitizen().getFirstName() + " " + application.getCitizen().getLastName());
        send(recipients.admins(), application.getCitizen().getId(), NotificationType.APPLICATION_SUBMITTED,
                params, null, null, Map.of("applicationId", String.valueOf(application.getId())));
    }

    public void applicationApproved(FirstResponderApplication application) {
        send(List.of(application.getCitizen().getId()), null, NotificationType.APPLICATION_APPROVED,
                new HashMap<>(), null, null, Map.of("applicationId", String.valueOf(application.getId())));
    }

    public void applicationRejected(FirstResponderApplication application) {
        send(List.of(application.getCitizen().getId()), null, NotificationType.APPLICATION_REJECTED,
                new HashMap<>(), null, null, Map.of("applicationId", String.valueOf(application.getId())));
    }

    // ---- hospital ----------------------------------------------------------------

    /** An ambulance chose this hospital: its staff should prepare. */
    public void patientIncoming(HospitalTransfer transfer) {
        if (transfer.getHospital() == null) return; // free-text destination: nobody to tell
        Mission mission = transfer.getMission();
        Map<String, String> params = missionParams(mission);
        params.put("hospital", transfer.getHospital().getName());
        send(recipients.hospitalStaff(transfer.getHospital().getId()), null, NotificationType.PATIENT_INCOMING,
                params, mission.getIncident(), mission,
                Map.of("hospitalTransferId", String.valueOf(transfer.getId())));
    }

    // ---- legal documents ---------------------------------------------------------

    /** The Terms or Privacy Policy changed and everyone must accept it again. */
    public void legalDocumentUpdated(Collection<Long> userIds, String documentType) {
        send(userIds, null, NotificationType.LEGAL_UPDATED, new HashMap<>(Map.of("document", documentType)),
                null, null, Map.of("document", documentType));
    }

    // ---- plumbing ----------------------------------------------------------------

    private void toCitizen(Mission mission, NotificationType type) {
        Incident incident = mission.getIncident();
        send(List.of(incident.getCitizen().getId()), null, type, missionParams(mission), incident, mission);
    }

    private static Map<String, String> incidentParams(Incident incident) {
        Map<String, String> params = new HashMap<>();
        params.put("id", String.valueOf(incident.getId()));
        params.put("category", incident.getCategory() == null ? null : incident.getCategory().name());
        params.values().removeIf(java.util.Objects::isNull);
        return params;
    }

    private static Map<String, String> missionParams(Mission mission) {
        Map<String, String> params = incidentParams(mission.getIncident());
        params.put("unit", mission.getUnit().getPlateNumber());
        return params;
    }

    private void send(Collection<Long> userIds, Long excludeUserId, NotificationType type,
                      Map<String, String> params, Incident incident, Mission mission) {
        send(userIds, excludeUserId, type, params, incident, mission, Map.of());
    }

    private void send(Collection<Long> userIds, Long excludeUserId, NotificationType type,
                      Map<String, String> params, Incident incident, Mission mission, Map<String, String> extraData) {
        Set<Long> audience = new LinkedHashSet<>(userIds);
        if (excludeUserId != null) audience.remove(excludeUserId); // never notify someone of their own action
        if (audience.isEmpty()) return;

        Map<String, String> data = new HashMap<>(extraData);
        if (incident != null) data.put("incidentId", String.valueOf(incident.getId()));
        if (mission != null) data.put("missionId", String.valueOf(mission.getId()));

        events.publishEvent(new NotificationRequested(
                audience, type, params, data, incident == null ? null : incident.getId()));
    }
}
