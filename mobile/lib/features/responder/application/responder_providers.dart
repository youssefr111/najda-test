import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/location/location_service.dart';
import '../../../core/utils/polling.dart';
import '../data/responder_repository.dart';
import '../domain/mission.dart';
import '../domain/shift.dart';
import '../domain/unit.dart';

final myMissionsProvider = StreamProvider.autoDispose<List<Mission>>((ref) {
  final repository = ref.watch(responderRepositoryProvider);
  return pollingStream(const Duration(seconds: 5), repository.myMissions);
});

/// One mission picked out of the "mine" list (there is no single-mission
/// endpoint for responders), so it refreshes with that list.
final missionProvider = Provider.autoDispose.family<AsyncValue<Mission?>, int>((ref, id) {
  return ref.watch(myMissionsProvider).whenData(
        (missions) => missions.where((m) => m.id == id).firstOrNull,
      );
});

final myShiftProvider = StreamProvider.autoDispose<ShiftAssignment?>((ref) {
  final repository = ref.watch(responderRepositoryProvider);
  return pollingStream(const Duration(seconds: 10), repository.myShift);
});

final crewForUnitProvider =
    StreamProvider.autoDispose.family<List<ShiftAssignment>, int>((ref, unitId) {
  final repository = ref.watch(responderRepositoryProvider);
  return pollingStream(const Duration(seconds: 15), () => repository.crewForUnit(unitId));
});

final unitProvider = StreamProvider.autoDispose.family<ResponseUnit, int>((ref, unitId) {
  final repository = ref.watch(responderRepositoryProvider);
  return pollingStream(const Duration(seconds: 15), () => repository.unit(unitId));
});

final myFacilityUnitsProvider = FutureProvider.autoDispose<List<ResponseUnit>>(
  (ref) => ref.watch(responderRepositoryProvider).myFacilityUnits(),
);

enum LocationSharingStatus { idle, watching, denied, error }

class LocationSharing {
  const LocationSharing(this.status, {this.lastUpdatedAt});

  final LocationSharingStatus status;
  final DateTime? lastUpdatedAt;
}

/// Streams the device position to the backend for as long as something is
/// watching this provider (the shift screen while on shift). Throttled to one
/// update per [_minInterval] regardless of how often the OS reports movement,
/// and a failed update recovers on the next successful one.
final unitLocationSharingProvider =
    StreamProvider.autoDispose.family<LocationSharing, int>((ref, unitId) {
  const minInterval = Duration(seconds: 15);

  final controller = StreamController<LocationSharing>();
  StreamSubscription<LatLngPosition>? subscription;
  var lastSent = DateTime.fromMillisecondsSinceEpoch(0);

  void emit(LocationSharing next) {
    if (!controller.isClosed) controller.add(next);
  }

  Future<void> start() async {
    final locations = ref.read(locationServiceProvider);
    final repository = ref.read(responderRepositoryProvider);

    if (!await locations.ensurePermission()) {
      emit(const LocationSharing(LocationSharingStatus.denied));
      return;
    }
    if (controller.isClosed) return;

    emit(const LocationSharing(LocationSharingStatus.watching));
    subscription = locations.positionStream().listen(
      (position) async {
        final now = DateTime.now();
        if (now.difference(lastSent) < minInterval) return;
        lastSent = now;
        try {
          await repository.reportLocation(unitId, position.latitude, position.longitude);
          emit(LocationSharing(LocationSharingStatus.watching, lastUpdatedAt: DateTime.now()));
        } catch (_) {
          emit(const LocationSharing(LocationSharingStatus.error));
        }
      },
      onError: (_) => emit(const LocationSharing(LocationSharingStatus.error)),
    );
  }

  unawaited(start());
  ref.onDispose(() {
    unawaited(subscription?.cancel());
    unawaited(controller.close());
  });
  return controller.stream;
});
