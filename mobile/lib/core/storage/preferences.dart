import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Overridden in `bootstrap()` with the already-loaded instance, so every
/// consumer can read it synchronously.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider not overridden'),
);

abstract final class PrefKeys {
  static const locale = 'najda-locale';
  static const theme = 'najda-theme';
}
