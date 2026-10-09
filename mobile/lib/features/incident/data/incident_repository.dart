import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/incident.dart';
import '../domain/incident_responder.dart';

final incidentRepositoryProvider = Provider<IncidentRepository>(
  (ref) => IncidentRepository(ref.watch(apiClientProvider)),
);

class IncidentRepository {
  const IncidentRepository(this._api);

  final ApiClient _api;

  Future<List<Incident>> mine() async =>
      asJsonList(await _api.get('/api/incidents/mine')).map(Incident.fromJson).toList();

  Future<Incident> byId(int id) async =>
      Incident.fromJson(asJsonMap(await _api.get('/api/incidents/$id')));

  Future<Incident> submit(SubmitIncidentRequest request) async => Incident.fromJson(
        asJsonMap(await _api.post('/api/incidents', body: request.toJson())),
      );

  /// Citizen cancellation, allowed until a unit has arrived. Cancelling stands
  /// every offered/accepted/en-route unit down. (`DELETE /api/incidents/{id}` is
  /// a destructive SUPER_ADMIN-only endpoint -- not this one.)
  Future<void> cancel(int id, {required CancellationCategory category, String? details}) =>
      _api.post(
        '/api/incidents/$id/cancel',
        body: {'category': category.wire, 'details': details},
      );

  /// Citizen-safe view of the units working an incident: type, status and live
  /// position only. Police positions are withheld by the server.
  Future<List<IncidentResponder>> responders(int id) async =>
      asJsonList(await _api.get('/api/incidents/$id/responders'))
          .map(IncidentResponder.fromJson)
          .toList();

  Future<Incident> updateInjuredCount(int id, int injuredCount) async => Incident.fromJson(
        asJsonMap(
          await _api.patch('/api/incidents/$id/injured-count', body: {'injuredCount': injuredCount}),
        ),
      );
}
