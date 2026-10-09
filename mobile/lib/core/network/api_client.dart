import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import 'api_exception.dart';

const _defaultTimeout = Duration(seconds: 15);

final appConfigProvider = Provider<AppConfig>(
  (ref) => throw UnimplementedError('appConfigProvider not overridden'),
);

final firebaseAuthProvider = Provider<FirebaseAuth>((ref) => FirebaseAuth.instance);

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    baseUrl: ref.watch(appConfigProvider).apiBaseUrl,
    auth: ref.watch(firebaseAuthProvider),
  );
});

/// Thin wrapper over the Spring Boot backend.
///
/// There is no session cookie on mobile (that is a Next.js-only concept): the
/// Firebase ID token, refreshed transparently by the SDK when close to expiry,
/// is the only credential. Every call is bounded by a timeout.
class ApiClient {
  ApiClient({required String baseUrl, required FirebaseAuth auth})
      : _auth = auth,
        _baseUrl = baseUrl,
        _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: _defaultTimeout,
            sendTimeout: _defaultTimeout,
            receiveTimeout: _defaultTimeout,
            contentType: Headers.jsonContentType,
            // Non-2xx responses are mapped to ApiException in [_send].
            validateStatus: (_) => true,
          ),
        );

  final FirebaseAuth _auth;
  final String _baseUrl;
  final Dio _dio;

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? query,
    Duration? timeout,
  }) =>
      _send('GET', path, query: query, timeout: timeout);

  Future<dynamic> post(String path, {Object? body, Duration? timeout}) =>
      _send('POST', path, body: body, timeout: timeout);

  Future<dynamic> patch(String path, {Object? body, Duration? timeout}) =>
      _send('PATCH', path, body: body, timeout: timeout);

  Future<dynamic> delete(String path, {Duration? timeout}) =>
      _send('DELETE', path, timeout: timeout);

  Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Duration? timeout,
  }) async {
    final limit = timeout ?? _defaultTimeout;

    try {
      final token = await _auth.currentUser?.getIdToken().timeout(
            limit,
            onTimeout: () => throw const ApiException(
              'Timed out refreshing your session token.',
            ),
          );

      final response = await _dio.request<dynamic>(
        path,
        data: body,
        queryParameters: query,
        options: Options(
          method: method,
          headers: {if (token != null) 'Authorization': 'Bearer $token'},
          sendTimeout: limit,
          receiveTimeout: limit,
        ),
      );

      final status = response.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        throw ApiException(_messageFrom(response.data, status), status: status);
      }

      // Covers every empty-body success shape (204, ResponseEntity.ok().build()).
      final data = response.data;
      return (data is String && data.isEmpty) ? null : data;
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      throw ApiException(_describe(e));
    }
  }

  String _messageFrom(Object? data, int status) {
    if (data is Map<String, dynamic>) {
      final message = data['error'] ?? data['message'];
      if (message is String && message.isNotEmpty) return message;
    }
    return 'Request failed with $status';
  }

  String _describe(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Timed out reaching $_baseUrl. Check API_BASE_URL (use your '
            "machine's LAN IP, not localhost, on a physical device) and that "
            'the backend is running and reachable.';
      default:
        return 'Network request failed -- is the backend reachable from this device?';
    }
  }
}
