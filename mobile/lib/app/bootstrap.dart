import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import '../core/config/app_config.dart';
import '../core/config/flavor.dart';
import '../core/network/api_client.dart';
import '../core/l10n/l10n_x.dart';
import '../core/storage/preferences.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/presentation/splash_screen.dart';

/// Loads the flavor's configuration, initialises Firebase and starts the app.
/// Any failure (most commonly a missing env value) is shown on screen instead
/// of leaving a blank window.
Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  // The same red splash as the native launch screen, with the moving line, from the very first
  // frame -- so opening the app, waiting for Firebase and waiting for the session all look alike.
  runApp(const _BootSplashApp());

  try {
    final config = await AppConfig.load(Flavor.current);
    await Firebase.initializeApp(options: config.firebase);
    final preferences = await SharedPreferences.getInstance();

    runApp(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(config),
          sharedPreferencesProvider.overrideWithValue(preferences),
        ],
        child: const NajdaApp(),
      ),
    );
  } catch (error, stackTrace) {
    // Visible in `flutter run` / logcat even if the on-screen text is cut off.
    debugPrint('[Bootstrap] Startup failed: $error');
    debugPrintStack(stackTrace: stackTrace);
    runApp(_StartupErrorApp(error: error, stackTrace: stackTrace));
  }
}

/// Shown while configuration and Firebase load. Needs its own MaterialApp because the real one
/// (and its router) does not exist yet.
class _BootSplashApp extends StatelessWidget {
  const _BootSplashApp();

  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const SplashScreen(),
      );
}

class _StartupErrorApp extends StatelessWidget {
  const _StartupErrorApp({required this.error, required this.stackTrace});

  final Object error;
  final StackTrace stackTrace;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('NAJDA could not start', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                Text('$error', style: const TextStyle(fontSize: 15, height: 1.4)),
                // Debug builds only: the first lines of the stack show which plugin failed.
                if (kDebugMode) ...[
                  const SizedBox(height: 16),
                  Expanded(
                    child: SingleChildScrollView(
                      child: SelectableText(
                        '$stackTrace',
                        style: const TextStyle(fontSize: 11, height: 1.3, fontFamily: 'monospace'),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
