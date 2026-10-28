import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/live/live_stream.dart';
import '../../../core/live/stomp_hub.dart';
import '../data/incident_repository.dart';
import '../domain/incident.dart';
import '../domain/incident_responder.dart';

/// The signed-in citizen's reports, pushed live.
final myIncidentsProvider = StreamProvider.autoDispose<List<Incident>>((ref) {
  final repository = ref.watch(incidentRepositoryProvider);
  return liveStream(
    hub: ref.watch(stompHubProvider),
    topics: const ['/topic/incidents'],
    fetch: repository.mine,
  );
});

/// One incident, refetched whenever any incident changes.
final incidentProvider = StreamProvider.autoDispose.family<Incident, int>((
  ref,
  id,
) {
  final repository = ref.watch(incidentRepositoryProvider);
  return liveStream(
    hub: ref.watch(stompHubProvider),
    topics: const ['/topic/incidents'],
    fetch: () => repository.byId(id),
  );
});

/// The units working an incident, for the citizen's tracking map.
final incidentRespondersProvider = StreamProvider.autoDispose
    .family<List<IncidentResponder>, int>((ref, id) {
      final repository = ref.watch(incidentRepositoryProvider);
      return liveStream(
        hub: ref.watch(stompHubProvider),
        topics: ['/topic/incidents/$id/responders'],
        fetch: () => repository.responders(id),
      );
    });
