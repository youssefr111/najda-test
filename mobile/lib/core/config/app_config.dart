import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'flavor.dart';

/// Thrown at startup when the flavor's env file is missing values. Caught in
/// `bootstrap()` and shown on screen: a missing config value should fail
/// loudly on boot, never silently 404 the first API call.
class MissingConfigException implements Exception {
  const MissingConfigException(this.keys, this.envFile);

  final List<String> keys;
  final String envFile;

  @override
  String toString() =>
      'Missing ${keys.join(', ')} in $envFile. Copy env/.env.example, fill it in, and rebuild.';
}

/// Immutable, typed view of the flavor's env file.
class AppConfig {
  const AppConfig({
    required this.flavor,
    required this.apiBaseUrl,
    required this.wsUrl,
    required this.firebase,
    required this.googleWebClientId,
    required this.emailJs,
  });

  final Flavor flavor;
  final String apiBaseUrl;
  final String wsUrl;
  final FirebaseOptions firebase;
  final String googleWebClientId;
  final EmailJsConfig emailJs;

  static Future<AppConfig> load(Flavor flavor) async {
    await dotenv.load(fileName: flavor.envFile);

    final missing = <String>[];
    String required(String key) {
      final value = dotenv.maybeGet(key)?.trim() ?? '';
      if (value.isEmpty) missing.add(key);
      return value;
    }

    String optional(String key) => dotenv.maybeGet(key)?.trim() ?? '';

    final apiBaseUrl = required('API_BASE_URL');
    final wsUrl = required('WS_URL');

    final generalKey = required('FIREBASE_API_KEY');
    final androidKey = required('FIREBASE_ANDROID_API_KEY');
    final iosKey = optional('FIREBASE_IOS_API_KEY');
    final projectId = required('FIREBASE_PROJECT_ID');
    final storageBucket = required('FIREBASE_STORAGE_BUCKET');
    final senderId = required('FIREBASE_MESSAGING_SENDER_ID');
    final webAppId = required('FIREBASE_APP_ID');
    final androidAppId = optional('FIREBASE_ANDROID_APP_ID');

    final googleWebClientId = required('GOOGLE_WEB_CLIENT_ID');

    if (missing.isNotEmpty) {
      throw MissingConfigException(missing, flavor.envFile);
    }

    final isAndroid = Platform.isAndroid;
    final firebase = FirebaseOptions(
      apiKey: isAndroid ? androidKey : (iosKey.isNotEmpty ? iosKey : generalKey),
      appId: isAndroid && androidAppId.isNotEmpty ? androidAppId : webAppId,
      messagingSenderId: senderId,
      projectId: projectId,
      storageBucket: storageBucket,
    );

    return AppConfig(
      flavor: flavor,
      apiBaseUrl: apiBaseUrl.replaceAll(RegExp(r'/+$'), ''),
      wsUrl: wsUrl,
      firebase: firebase,
      googleWebClientId: googleWebClientId,
      emailJs: EmailJsConfig(
        serviceId: optional('EMAILJS_SERVICE_ID'),
        templateId: optional('EMAILJS_TEMPLATE_ID'),
        publicKey: optional('EMAILJS_PUBLIC_KEY'),
      ),
    );
  }
}

class EmailJsConfig {
  const EmailJsConfig({
    required this.serviceId,
    required this.templateId,
    required this.publicKey,
  });

  final String serviceId;
  final String templateId;
  final String publicKey;

  bool get isConfigured =>
      serviceId.isNotEmpty && templateId.isNotEmpty && publicKey.isNotEmpty;
}
