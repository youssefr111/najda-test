import '../../features/auth/domain/role.dart';
import '../../features/incident/domain/incident.dart';
import '../../features/responder/domain/mission.dart';
import '../../features/responder/domain/shift.dart';
import '../../features/responder/domain/unit.dart';
import 'l10n_x.dart';

/// Translated display names for backend enums. Every `switch` is exhaustive on
/// purpose: adding an enum value is a compile error until it is translated.
String roleLabel(AppLocalizations l, Role role) => switch (role) {
      Role.citizen => l.enumsRoleCitizen,
      Role.dispatcher => l.enumsRoleDispatcher,
      Role.ambulanceCrew => l.enumsRoleAmbulanceCrew,
      Role.police => l.enumsRolePolice,
      Role.firefighter => l.enumsRoleFirefighter,
      Role.firstResponder => l.enumsRoleFirstResponder,
      Role.hospitalStaff => l.enumsRoleHospitalStaff,
      Role.admin => l.enumsRoleAdmin,
      Role.superAdmin => l.enumsRoleSuperAdmin,
    };

String categoryLabel(AppLocalizations l, IncidentCategory category) => switch (category) {
      IncidentCategory.medical => l.enumsCategoryMedical,
      IncidentCategory.fire => l.enumsCategoryFire,
      IncidentCategory.police => l.enumsCategoryPolice,
    };

String incidentStatusLabel(AppLocalizations l, IncidentStatus status) => switch (status) {
      IncidentStatus.created => l.enumsIncidentStatusNew,
      IncidentStatus.aiProcessed => l.enumsIncidentStatusAiProcessed,
      IncidentStatus.dispatcherReview => l.enumsIncidentStatusDispatcherReview,
      IncidentStatus.assigned => l.enumsIncidentStatusAssigned,
      IncidentStatus.inProgress => l.enumsIncidentStatusInProgress,
      IncidentStatus.resolved => l.enumsIncidentStatusResolved,
      IncidentStatus.cancelled => l.enumsIncidentStatusCancelled,
    };

String aiPriorityLabel(AppLocalizations l, AiPriority priority) => switch (priority) {
      AiPriority.critical => l.enumsAiPriorityCritical,
      AiPriority.high => l.enumsAiPriorityHigh,
      AiPriority.medium => l.enumsAiPriorityMedium,
      AiPriority.low => l.enumsAiPriorityLow,
    };

String missionStatusLabel(AppLocalizations l, MissionStatus status) => switch (status) {
      MissionStatus.offered => l.enumsMissionStatusOffered,
      MissionStatus.accepted => l.enumsMissionStatusAccepted,
      MissionStatus.rejected => l.enumsMissionStatusRejected,
      MissionStatus.enRoute => l.enumsMissionStatusEnRoute,
      MissionStatus.arrived => l.enumsMissionStatusArrived,
      MissionStatus.completed => l.enumsMissionStatusCompleted,
      MissionStatus.cancelled => l.enumsMissionStatusCancelled,
    };

String unitTypeLabel(AppLocalizations l, UnitType type) => switch (type) {
      UnitType.ambulance => l.enumsUnitTypeAmbulance,
      UnitType.fireTruck => l.enumsUnitTypeFireTruck,
      UnitType.policeCar => l.enumsUnitTypePoliceCar,
      UnitType.firstResponder => l.enumsUnitTypeFirstResponder,
    };

String roleInShiftLabel(AppLocalizations l, RoleInShift role) => switch (role) {
      RoleInShift.lead => l.enumsRoleInShiftLead,
      RoleInShift.crew => l.enumsRoleInShiftCrew,
    };

String cancellationCategoryLabel(AppLocalizations l, CancellationCategory category) =>
    switch (category) {
      CancellationCategory.submittedByMistake => l.enumsCancellationCategorySubmittedByMistake,
      CancellationCategory.situationResolved => l.enumsCancellationCategorySituationResolved,
      CancellationCategory.gotHelpElsewhere => l.enumsCancellationCategoryGotHelpElsewhere,
      CancellationCategory.duplicateReport => l.enumsCancellationCategoryDuplicateReport,
      CancellationCategory.other => l.enumsCancellationCategoryOther,
    };

/// What the citizen sees for a responding unit's progress.
String responderProgressLabel(AppLocalizations l, MissionStatus status) => switch (status) {
      MissionStatus.accepted => l.responderTrackingStatusAccepted,
      MissionStatus.enRoute => l.responderTrackingStatusEnRoute,
      MissionStatus.arrived => l.responderTrackingStatusArrived,
      _ => missionStatusLabel(l, status),
    };
