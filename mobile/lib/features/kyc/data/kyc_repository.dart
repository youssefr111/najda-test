import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/kyc.dart';

final kycRepositoryProvider = Provider<KycRepository>((ref) => KycRepository(ref.watch(apiClientProvider)));

class KycRepository {
  const KycRepository(this._api);

  final ApiClient _api;

  Future<KycState> status() async => KycState.fromJson(asJsonMap(await _api.get('/api/kyc/status')));

  /// Asks the backend for a hosted verification page. The person finishes it in the browser; the RESULT only ever
  /// comes back through the backend (never from the page), so there is nothing to trust here but the URL.
  Future<String?> startSession() async => asJsonMap(await _api.post('/api/kyc/session'))['url'] as String?;
}
