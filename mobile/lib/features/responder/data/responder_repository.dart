import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/mission.dart';
import '../domain/shift.dart';
import '../domain/unit.dart';

final responderRepositoryProvider = Provider<ResponderRepository>(
  (ref) => ResponderRepository(ref.watch(apiClientProvider)),
);

/// Missions, shifts and units: everything a field responder works with.
class ResponderRepository {
  const ResponderRepository(this._api);

  final ApiClient _api;

  // ---- missions ----

  Future<List<Mission>> myMissions() async =>
      asJsonList(await _api.get('/api/missions/mine')).map(Mission.fromJson).toList();

  Future<Mission> acceptMission(int id) => _missionAction(id, 'accept');
  Future<Mission> markEnRoute(int id) => _missionAction(id, 'en-route');
  Future<Mission> markArrived(int id) => _missionAction(id, 'arrived');

  /// Only the unit's LEAD can complete, and only for non-ambulance units
  /// (ambulance missions finish through the hospital handoff instead).
  Future<Mission> completeMission(int id) => _missionAction(id, 'complete');

  /// Pull out of an ACCEPTED / EN_ROUTE mission.
  Future<Mission> withdrawMission(int id) => _missionAction(id, 'withdraw');

  Future<Mission> rejectMission(int id, String reason) async => Mission.fromJson(
        asJsonMap(await _api.post('/api/missions/$id/reject', body: {'reason': reason})),
      );

  Future<Mission> _missionAction(int id, String action) async =>
      Mission.fromJson(asJsonMap(await _api.post('/api/missions/$id/$action')));

  // ---- shifts ----

  /// `null` when the caller is not on shift (the endpoint answers with an empty body).
  Future<ShiftAssignment?> myShift() async {
    final json = await _api.get('/api/shifts/me');
    return json == null ? null : ShiftAssignment.fromJson(asJsonMap(json));
  }

  Future<List<ShiftAssignment>> crewForUnit(int unitId) async =>
      asJsonList(await _api.get('/api/shifts/unit/$unitId/crew'))
          .map(ShiftAssignment.fromJson)
          .toList();

  Future<void> startShift(int unitId) => _api.post('/api/shifts/start', body: {'unitId': unitId});
  Future<void> joinShift(int unitId) => _api.post('/api/shifts/join', body: {'unitId': unitId});
  Future<void> leaveShift() => _api.post('/api/shifts/leave');
  Future<void> endShift() => _api.post('/api/shifts/end');

  // ---- units ----

  /// Units at the responder's own facility: the pool a shift can be started on.
  Future<List<ResponseUnit>> myFacilityUnits() async =>
      asJsonList(await _api.get('/api/units/mine')).map(ResponseUnit.fromJson).toList();

  Future<ResponseUnit> unit(int id) async =>
      ResponseUnit.fromJson(asJsonMap(await _api.get('/api/units/$id')));

  /// Moves the unit back to its facility's location (unit LEAD or admin).
  Future<void> resetLocation(int unitId) => _api.post('/api/units/$unitId/location/reset');

  Future<void> reportLocation(int unitId, double latitude, double longitude) => _api.patch(
        '/api/units/$unitId/location',
        body: {'latitude': latitude, 'longitude': longitude},
      );
}
