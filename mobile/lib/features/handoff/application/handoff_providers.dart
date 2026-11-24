import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/live/live_stream.dart';
import '../../../core/live/stomp_hub.dart';
import '../../../core/geo/geo.dart';
import '../data/hospital_transfer_repository.dart';
import '../domain/hospital_transfer.dart';

/// The mission's transfer (null before a destination is chosen).
final hospitalTransferProvider = StreamProvider.autoDispose
    .family<HospitalTransfer?, int>((ref, missionId) {
      final repository = ref.watch(hospitalTransferRepositoryProvider);
      return liveStream(
        hub: ref.watch(stompHubProvider),
        topics: const ['/topic/missions'],
        safetyNet: const Duration(seconds: 20),
        fetch: () => repository.forMission(missionId),
      );
    });

final hospitalsProvider = FutureProvider.autoDispose<List<Hospital>>(
  (ref) => ref.watch(hospitalTransferRepositoryProvider).hospitals(),
);

final recommendedHospitalsProvider = FutureProvider.autoDispose
    .family<List<HospitalCandidate>, int>(
      (ref, missionId) =>
          ref.watch(hospitalTransferRepositoryProvider).recommended(missionId),
    );

/// The vitals of every ambulance transfer on an incident the user may see. New readings and transfer changes
/// arrive as payload-free nudges, so this refetches instead of subscribing to each transfer's own topic.
final incidentVitalsProvider = StreamProvider.autoDispose
    .family<List<IncidentTransferVitals>, int>((ref, incidentId) {
      final repository = ref.watch(hospitalTransferRepositoryProvider);
      return liveStream(
        hub: ref.watch(stompHubProvider),
        topics: const ['/topic/vitals', '/topic/hospital-transfers'],
        fetch: () => repository.vitalsForIncident(incidentId),
      );
    });

/// Everything the picker needs for one mission, merged and sorted nearest-first:
/// the full hospital list, the backend's ranking hints, and the crew's own base.
typedef HospitalOptionsQuery = ({
  int missionId,
  double incidentLat,
  double incidentLng,
  int? ownFacilityId,
});

final hospitalOptionsProvider = Provider.autoDispose
    .family<AsyncValue<List<HospitalOption>>, HospitalOptionsQuery>((
      ref,
      query,
    ) {
      final hospitals = ref.watch(hospitalsProvider);
      final candidates =
          ref.watch(recommendedHospitalsProvider(query.missionId)).value ??
          const [];
      final hints = {for (final c in candidates) c.id: c};

      return hospitals.whenData((all) {
        final options =
            [
              for (final hospital in all)
                HospitalOption(
                  hospital: hospital,
                  distanceKm:
                      hints[hospital.id]?.distanceKm ??
                      haversineKm(
                        query.incidentLat,
                        query.incidentLng,
                        hospital.latitude,
                        hospital.longitude,
                      ),
                  recommended: hints[hospital.id]?.recommended ?? false,
                  isOwnBase: query.ownFacilityId == hospital.id,
                ),
            ]..sort(
              (a, b) => (a.distanceKm ?? double.infinity).compareTo(
                b.distanceKm ?? double.infinity,
              ),
            );
        return options;
      });
    });
