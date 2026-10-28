import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/json.dart';
import '../../../core/utils/file_types.dart';
import '../domain/incident_media.dart';

final incidentMediaRepositoryProvider = Provider<IncidentMediaRepository>(
  (ref) => IncidentMediaRepository(ref.watch(apiClientProvider)),
);

/// A one-time place in storage to put a file, and the path to register afterwards.
class UploadSlot {
  const UploadSlot({required this.uploadUrl, required this.path});

  final String uploadUrl;
  final String path;
}

class IncidentMediaRepository {
  IncidentMediaRepository(this._api);

  final ApiClient _api;

  /// Talks to the storage provider directly (no app credentials involved), so
  /// it deliberately does not use [ApiClient].
  final Dio _storage = Dio();

  static const _slow = Duration(seconds: 30);

  /// Step 1: ask the backend for a one-time upload slot.
  Future<UploadSlot> requestSlot({required int incidentId, required String filePath}) async {
    final extension = extensionOf(filePath);
    final signed = asJsonMap(
      await _api.post(
        '/api/incident-media/upload-url?incidentId=$incidentId&fileExtension=$extension',
        timeout: _slow,
      ),
    );
    return UploadSlot(uploadUrl: signed['uploadUrl'] as String, path: signed['path'] as String);
  }

  /// Step 2: send the file straight to storage.
  Future<void> putFile(UploadSlot slot, String filePath) =>
      _putFile(slot.uploadUrl, File(filePath), contentTypeFor(extensionOf(filePath)));

  /// Step 3: tell the backend the file is there. A 2xx answer means it is registered -- full stop. The
  /// response body is deliberately NOT parsed: the file is already stored and registered by then, and a
  /// parse error must never be mistaken for a failed upload (which re-uploads it, again and again).
  Future<void> register({required int incidentId, required MediaKind kind, required String storagePath}) async {
    await _api.post(
      '/api/incident-media',
      body: {'incidentId': incidentId, 'mediaType': kind.wire, 'path': storagePath},
      timeout: _slow,
    );
  }

  /// All three steps, for one-off uploads (adding evidence to an existing report).
  Future<void> upload({required int incidentId, required MediaKind kind, required String path}) async {
    final slot = await requestSlot(incidentId: incidentId, filePath: path);
    await putFile(slot, path);
    await register(incidentId: incidentId, kind: kind, storagePath: slot.path);
  }

  Future<void> _putFile(String uploadUrl, File file, String contentType) async {
    try {
      final response = await _storage.put<void>(
        uploadUrl,
        data: file.openRead(),
        options: Options(
          headers: {
            Headers.contentTypeHeader: contentType,
            Headers.contentLengthHeader: await file.length(),
          },
          sendTimeout: const Duration(minutes: 3),
          receiveTimeout: const Duration(minutes: 1),
          validateStatus: (_) => true,
        ),
      );
      final status = response.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        throw ApiException('Upload to storage failed (HTTP $status).', status: status);
      }
    } on DioException catch (e) {
      // Only a genuine connectivity problem is worth retrying. Anything else (a malformed request,
      // a rejected certificate...) will fail the same way every time, so it must not loop forever.
      final connectivity = {
        DioExceptionType.connectionTimeout,
        DioExceptionType.sendTimeout,
        DioExceptionType.receiveTimeout,
        DioExceptionType.connectionError,
      }.contains(e.type);
      debugPrint('[Upload] storage PUT failed (${e.type.name}): ${e.message}');
      throw ApiException(
        'Upload to storage failed (${e.type.name}).',
        status: connectivity ? 0 : 422,
      );
    }
  }

  /// A short-lived signed link; never store or build storage URLs by hand.
  Future<String> downloadUrl(int mediaId) async {
    final json = asJsonMap(await _api.get('/api/incident-media/$mediaId/download-url'));
    return json['downloadUrl'] as String;
  }

  Future<void> editText(int mediaId, String text) =>
      _api.patch('/api/incident-media/$mediaId/text', body: {'textContent': text});

  Future<void> delete(int mediaId) => _api.delete('/api/incident-media/$mediaId');
}