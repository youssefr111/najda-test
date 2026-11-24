import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/preferences.dart';
import '../data/incident_repository.dart';
import '../domain/incident_location_config.dart';

/// The backend's location rules, with an offline fallback: the last rules seen
/// are cached, so the report form still validates correctly with no signal. If
/// there is neither network nor cache, the safest assumption is used (GPS only,
/// no local boundary check) and the server remains the judge.
final incidentLocationConfigProvider = FutureProvider<IncidentLocationConfig>((
  ref,
) async {
  final prefs = ref.read(sharedPreferencesProvider);

  try {
    final config = await ref.read(incidentRepositoryProvider).locationConfig();
    await prefs.setString(
      PrefKeys.incidentLocationConfig,
      jsonEncode(config.toJson()),
    );
    return config;
  } catch (error) {
    debugPrint('[LocationConfig] Using cached rules: $error');
    final cached = prefs.getString(PrefKeys.incidentLocationConfig);
    if (cached != null) {
      try {
        return IncidentLocationConfig.fromJson(
          Map<String, dynamic>.from(jsonDecode(cached) as Map),
        );
      } catch (_) {
        // fall through to the safe default
      }
    }
    return IncidentLocationConfig.unknown;
  }
});
