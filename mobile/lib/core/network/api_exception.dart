/// Error thrown by the API layer. `status == 0` means the request never got a
/// response (offline, DNS, timeout, ...).
class ApiException implements Exception {
  const ApiException(this.message, {this.status = 0});

  final String message;
  final int status;

  bool get isNetworkError => status == 0;

  @override
  String toString() => 'ApiException($status): $message';
}
