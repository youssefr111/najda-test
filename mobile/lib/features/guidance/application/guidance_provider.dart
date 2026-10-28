import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/preferences.dart';
import '../data/guidance_repository.dart';
import '../domain/guidance.dart';

/// The safety guidance, with an offline fallback: the last copy received is
/// cached, so the tips still show with no signal. `null` means there is
/// neither network nor cache (first launch, offline).
final guidanceProvider = FutureProvider<GuidanceContent?>((ref) async {
  final prefs = ref.read(sharedPreferencesProvider);

  try {
    final json = await ref.read(guidanceRepositoryProvider).fetch();
    final content = GuidanceContent.fromJson(json);
    await prefs.setString(PrefKeys.guidanceContent, jsonEncode(json));
    return content;
  } catch (error) {
    debugPrint('[Guidance] Using cached copy: $error');
    final cached = prefs.getString(PrefKeys.guidanceContent);
    if (cached != null) {
      try {
        return GuidanceContent.fromJson(
          Map<String, dynamic>.from(jsonDecode(cached) as Map),
        );
      } catch (_) {
        // fall through: nothing usable cached
      }
    }
    return null;
  }
});
