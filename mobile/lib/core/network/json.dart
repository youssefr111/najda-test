import 'api_exception.dart';

/// Narrow a decoded JSON value to the shape a repository expects, failing with
/// an [ApiException] instead of a raw cast error.
Map<String, dynamic> asJsonMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  throw const ApiException('Unexpected response from the server.');
}

List<Map<String, dynamic>> asJsonList(Object? value) {
  if (value is List<dynamic>) return value.cast<Map<String, dynamic>>();
  throw const ApiException('Unexpected response from the server.');
}

DateTime parseDate(Object? value) => DateTime.parse(value! as String).toLocal();
DateTime? parseDateOrNull(Object? value) =>
    value == null ? null : DateTime.parse(value as String).toLocal();
