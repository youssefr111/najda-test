import 'dart:math';

/// A random 128-bit id (32 hex characters) for idempotent requests.
///
/// Generated once per report and sent with every attempt to submit it, so the
/// server can recognise a retry of a report it already saved instead of
/// creating a duplicate. Matches the backend's `[A-Za-z0-9_-]{8,64}` rule.
String generateRequestId() {
  final random = Random.secure();
  return [
    for (var i = 0; i < 16; i++)
      random.nextInt(256).toRadixString(16).padLeft(2, '0'),
  ].join();
}
