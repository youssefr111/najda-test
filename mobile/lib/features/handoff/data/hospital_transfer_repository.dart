import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/hospital_transfer.dart';

final hospitalTransferRepositoryProvider = Provider<HospitalTransferRepository>(
  (ref) => HospitalTransferRepository(ref.watch(apiClientProvider)),
);

class HospitalTransferRepository {
  const HospitalTransferRepository(this._api);

  final ApiClient _api;

  /// `null` until the crew has selected a destination.
  Future<HospitalTransfer?> forMission(int missionId) async {
    final json = await _api.get('/api/hospital-transfers/mission/$missionId');
    return json == null ? null : HospitalTransfer.fromJson(asJsonMap(json));
  }

  Future<List<HospitalCandidate>> recommended(int missionId) async =>
      asJsonList(
        await _api.get('/api/hospital-transfers/recommended/$missionId'),
      ).map(HospitalCandidate.fromJson).toList();

  Future<List<Hospital>> hospitals() async => asJsonList(
    await _api.get('/api/facilities', query: {'type': 'HOSPITAL'}),
  ).map(Hospital.fromJson).toList();

  /// Exactly one of [hospitalId] / [destinationNameFreetext].
  Future<HospitalTransfer> select({
    required int missionId,
    int? hospitalId,
    String? destinationNameFreetext,
  }) async => HospitalTransfer.fromJson(
    asJsonMap(
      await _api.post(
        '/api/hospital-transfers/select',
        body: {
          'missionId': missionId,
          'hospitalId': hospitalId,
          'destinationNameFreetext': destinationNameFreetext,
        },
      ),
    ),
  );

  Future<HospitalTransfer> markEnRoute(int transferId) async =>
      HospitalTransfer.fromJson(
        asJsonMap(
          await _api.post('/api/hospital-transfers/$transferId/en-route'),
        ),
      );

  /// Arriving completes the transfer and resolves the mission.
  Future<HospitalTransfer> markArrived(int transferId) async =>
      HospitalTransfer.fromJson(
        asJsonMap(
          await _api.post('/api/hospital-transfers/$transferId/arrived'),
        ),
      );

  /// The server answers with just `{"message": "Vitals sent"}` (not the saved
  /// reading), so there is nothing to parse: callers refresh the history list.
  /// Parsing that body as a reading used to throw *after* a successful save,
  /// making the crew think it had failed and resubmit.
  Future<void> sendVitals(VitalsInput input) =>
      _api.post('/api/hospital-transfers/vitals', body: input.toJson());

  Future<List<VitalsReading>> vitalsHistory(int transferId) async => asJsonList(
    await _api.get('/api/hospital-transfers/$transferId/vitals'),
  ).map(VitalsReading.fromJson).toList();
}
