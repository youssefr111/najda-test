import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/app_config.dart';
import 'core/config/flavor.dart';
import 'core/network/api_client.dart';
import 'core/storage/preferences.dart';

/// Loads the flavor's configuration, initialises Firebase and starts the app.
/// Any failure (most commonly a missing env value) is shown on screen instead
/// of leaving a blank window.
Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

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
  } catch (error) {
    runApp(_StartupErrorApp(error: error));
  }
}

class _StartupErrorApp extends StatelessWidget {
  const _StartupErrorApp({required this.error});

  final Object error;

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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
