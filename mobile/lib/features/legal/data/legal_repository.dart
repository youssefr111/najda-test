import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/legal.dart';

final legalRepositoryProvider = Provider<LegalRepository>(
  (ref) => LegalRepository(ref.watch(apiClientProvider)),
);

class LegalRepository {
  const LegalRepository(this._api);

  final ApiClient _api;

  /// The raw response, so the caller can cache it exactly as received.
  Future<Map<String, dynamic>> fetchDocument(LegalDocumentType type) async =>
      asJsonMap(await _api.get('/api/legal/documents/${type.slug}'));

  Future<List<PendingConsent>> fetchPending() async {
    final json = asJsonMap(await _api.get('/api/legal/consent'));
    return [
      for (final item in json['pending'] as List<dynamic>)
        PendingConsent.fromJson(item as Map<String, dynamic>),
    ];
  }

  Future<void> accept(List<int> versionIds) async {
    await _api.post(
      '/api/legal/consent',
      body: {'versionIds': versionIds, 'source': 'MOBILE'},
    );
  }
}
