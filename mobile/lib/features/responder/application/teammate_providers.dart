import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/live/live_stream.dart';
import '../../../core/live/stomp_hub.dart';
import '../data/responder_repository.dart';
import '../domain/mission.dart';
import '../domain/teammate_unit.dart';
import '../domain/unit.dart';

final incidentMissionsProvider = StreamProvider.autoDispose
    .family<List<Mission>, int>((ref, incidentId) {
      final repository = ref.watch(responderRepositoryProvider);
      return liveStream(
        hub: ref.watch(stompHubProvider),
        topics: ['/topic/missions', '/topic/incidents/$incidentId/responders'],
        fetch: () => repository.incidentMissions(incidentId),
      );
    });

final allUnitsProvider = StreamProvider.autoDispose<List<ResponseUnit>>((ref) {
  final repository = ref.watch(responderRepositoryProvider);
  return liveStream(
    hub: ref.watch(stompHubProvider),
    topics: const ['/topic/units'],
    fetch: repository.allUnits,
  );
});

typedef TeammatesQuery = ({int missionId, int incidentId});

/// The other units on this mission's incident, ready to draw.
final teammatesProvider = Provider.autoDispose
    .family<List<TeammateUnit>, TeammatesQuery>((ref, query) {
      final missions =
          ref.watch(incidentMissionsProvider(query.incidentId)).value ??
          const [];
      final units = ref.watch(allUnitsProvider).value ?? const [];
      return teammateUnits(
        currentMissionId: query.missionId,
        incidentMissions: missions,
        units: units,
      );
    });
