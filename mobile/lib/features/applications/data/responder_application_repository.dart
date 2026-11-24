import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../../../core/utils/file_types.dart';
import '../domain/responder_application.dart';

final responderApplicationRepositoryProvider =
    Provider<ResponderApplicationRepository>(
      (ref) => ResponderApplicationRepository(ref.watch(apiClientProvider)),
    );

class ResponderApplicationRepository {
  const ResponderApplicationRepository(this._api);

  final ApiClient _api;

  Future<List<ResponderApplication>> mine() async => asJsonList(
    await _api.get('/api/first-responder-applications/mine'),
  ).map(ResponderApplication.fromJson).toList();

  /// One atomic request: the motivation and every supporting document together,
  /// so an application never exists without its documents.
  Future<void> submit({
    required String motivation,
    required List<PickedDocument> documents,
  }) async {
    final form = FormData.fromMap({
      'motivation': motivation,
      'files': [
        for (final document in documents)
          await MultipartFile.fromFile(
            document.path,
            filename: document.name,
            contentType: DioMediaType.parse(
              contentTypeFor(extensionOf(document.name)),
            ),
          ),
      ],
    });
    await _api.postForm(
      '/api/first-responder-applications',
      form,
      timeout: const Duration(minutes: 2),
    );
  }
}
