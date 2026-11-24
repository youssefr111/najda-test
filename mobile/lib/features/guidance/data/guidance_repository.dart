import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';

final guidanceRepositoryProvider = Provider<GuidanceRepository>(
  (ref) => GuidanceRepository(ref.watch(apiClientProvider)),
);

class GuidanceRepository {
  const GuidanceRepository(this._api);

  final ApiClient _api;

  /// The raw response, so the caller can cache it exactly as received.
  Future<Map<String, dynamic>> fetch() async =>
      asJsonMap(await _api.get('/api/guidance'));
}
