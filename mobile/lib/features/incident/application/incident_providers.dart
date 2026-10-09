import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/polling.dart';
import '../data/incident_repository.dart';
import '../domain/incident.dart';
import '../domain/incident_responder.dart';

/// The signed-in citizen's reports, refreshed every 15 seconds while visible.
final myIncidentsProvider = StreamProvider.autoDispose<List<Incident>>((ref) {
  final repository = ref.watch(incidentRepositoryProvider);
  return pollingStream(const Duration(seconds: 15), repository.mine);
});

/// One incident, refreshed every 5 seconds so status changes show up quickly.
final incidentProvider = StreamProvider.autoDispose.family<Incident, int>((ref, id) {
  final repository = ref.watch(incidentRepositoryProvider);
  return pollingStream(const Duration(seconds: 5), () => repository.byId(id));
});

/// The units working an incident, for the citizen's tracking map.
final incidentRespondersProvider =
    StreamProvider.autoDispose.family<List<IncidentResponder>, int>((ref, id) {
  final repository = ref.watch(incidentRepositoryProvider);
  return pollingStream(const Duration(seconds: 5), () => repository.responders(id));
});
