import 'package:flutter/services.dart' show appFlavor;

/// Build flavors. Each one maps 1:1 to an Android product flavor (see
/// android/app/build.gradle.kts) and to an env file under `env/`:
///
/// | flavor       | env file              | applicationId            | purpose                |
/// |--------------|-----------------------|--------------------------|------------------------|
/// | `local`      | `env/.env.local`      | `com.najda.mobile.local` | day-to-day development |
/// | `qa`         | `env/.env.test`       | `com.najda.mobile.test`  | your own test APK      |
/// | `production` | `env/.env.production` | `com.najda.mobile`       | the released app       |
///
/// The test flavor is called `qa` because the Android Gradle Plugin rejects
/// product-flavor names that start with "test" (they collide with its unit-test
/// source sets). Everything user-facing -- the env file, the app id suffix and
/// the app label -- still says "test".
enum Flavor {
  local('.env.local'),
  qa('.env.test'),
  production('.env.production');

  const Flavor(this._envFileName);

  final String _envFileName;

  /// Resolved from `--flavor` (Flutter exposes it as [appFlavor]).
  static Flavor get current {
    const name = appFlavor;
    for (final flavor in Flavor.values) {
      if (flavor.name == name) return flavor;
    }
    throw StateError(
      'Unknown or missing flavor "$name". Run the app with '
      '--flavor local|qa|production (see README).',
    );
  }

  String get envFile => 'env/$_envFileName';

  bool get isProduction => this == Flavor.production;

  /// Label for the corner banner / version line.
  String get label => this == Flavor.qa ? 'test' : name;
}
