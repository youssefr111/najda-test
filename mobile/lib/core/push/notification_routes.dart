import '../../features/auth/domain/role.dart';

/// Where tapping a notification should take this user. One mapping shared by
/// the inbox and by taps on the system notification, so they always agree.
///
/// [data] is the notification's id bag (`incidentId`, `missionId`, ...).
String notificationRoute({required String type, required Map<String, String> data, required Role role}) {
  final incidentId = data['incidentId'];
  final missionId = data['missionId'];
  final home = role == Role.citizen
      ? '/citizen'
      : role.isResponder
          ? '/responder'
          : '/desk';
  // A responder's shift and missions live in their middle tab.
  final work = role.isResponder ? '/responder/work' : home;

  return switch (type) {
    'MISSION_OFFERED' || 'MISSION_CANCELLED' =>
      role.isResponder && missionId != null ? '/responder/missions/$missionId' : work,
    'INCIDENT_ACCEPTED' ||
    'INCIDENT_EN_ROUTE' ||
    'INCIDENT_ARRIVED' ||
    'INCIDENT_RESOLVED' ||
    'INCIDENT_CLOSED_FALSE_REPORT' ||
    'INCIDENT_CLOSED_DUPLICATE' =>
      // Only ever sent to the person who filed the report: a citizen, or a responder reporting as one.
      (role == Role.citizen || role.isResponder) && incidentId != null ? '$home/incident/$incidentId' : '/notifications',
    // A citizen's chat is on their report; a crew member's is on their mission.
    'CHAT_MESSAGE' => role == Role.citizen && incidentId != null ? '/citizen/incident/$incidentId' : work,
    'APPLICATION_REJECTED' => role == Role.citizen ? '/citizen/account/become-responder' : '/notifications',
    _ => '/notifications',
  };
}
