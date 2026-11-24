import 'package:flutter/services.dart';

/// Why Google sign-in failed, extracted from the plugin's `PlatformException`.
///
/// The plugin reports nearly everything as `sign_in_failed` with the real
/// reason buried in the message (`ApiException: 10:`), which used to surface as
/// a useless "Something went wrong". Keeping the status code lets the app show
/// the right message and lets developers see exactly what Google rejected.
class GoogleSignInFailure implements Exception {
  const GoogleSignInFailure({
    required this.code,
    required this.statusCode,
    required this.details,
  });

  factory GoogleSignInFailure.from(PlatformException error) {
    final text = '${error.message ?? ''} ${error.details ?? ''}';
    final status = RegExp(r'ApiException:\s*(\d+)').firstMatch(text)?.group(1);
    return GoogleSignInFailure(
      code: error.code,
      statusCode: status == null ? null : int.parse(status),
      details: text.trim(),
    );
  }

  /// The plugin's code, usually `sign_in_failed` or `network_error`.
  final String code;

  /// Google Play services status: 10 = developer error (wrong SHA-1 / package /
  /// client id), 12500 = sign-in failed, 7 = network, 12501 = cancelled...
  final int? statusCode;
  final String details;

  bool get isNetwork => code == 'network_error' || statusCode == 7;

  /// Short label for diagnostics, e.g. `sign_in_failed / 10`.
  String get label => statusCode == null ? code : '$code / $statusCode';

  @override
  String toString() => 'GoogleSignInFailure($label): $details';
}
