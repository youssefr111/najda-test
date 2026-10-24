import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/medical_profile.dart';

final medicalRepositoryProvider = Provider<MedicalRepository>(
  (ref) => MedicalRepository(ref.watch(apiClientProvider)),
);

class MedicalRepository {
  const MedicalRepository(this._api);

  final ApiClient _api;

  static const _path = '/api/users/me/medical-profile';

  /// The caller's own profile (an all-empty one if nothing was saved yet).
  Future<MedicalProfile> get() async =>
      MedicalProfile.fromJson(asJsonMap(await _api.get(_path)));

  /// Replaces the whole profile.
  Future<MedicalProfile> save(MedicalProfile profile) async =>
      MedicalProfile.fromJson(
        asJsonMap(await _api.put(_path, body: profile.toRequestJson())),
      );

  Future<void> delete() => _api.delete(_path);

  /// The patient's profile for an incident, as seen by the people treating them.
  /// Throws an [ApiException] with status 403 for roles that may not see it.
  Future<IncidentMedicalProfile> forIncident(int incidentId) async =>
      IncidentMedicalProfile.fromJson(
        asJsonMap(await _api.get('/api/incidents/$incidentId/medical-profile')),
      );
}
