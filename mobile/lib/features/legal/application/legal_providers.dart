import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/preferences.dart';
import '../../auth/application/auth_controller.dart';
import '../data/legal_repository.dart';
import '../domain/legal.dart';

/// The legal document in force, with an offline fallback: the last copy received
/// is cached, so the pages still open with no signal. `null` means there is
/// neither network nor cache.
final legalDocumentProvider =
    FutureProvider.family<LegalDocument?, LegalDocumentType>((ref, type) async {
      final prefs = ref.read(sharedPreferencesProvider);
      final key = PrefKeys.legalDocument(type.slug);

      try {
        final json = await ref.read(legalRepositoryProvider).fetchDocument(type);
        final document = LegalDocument.fromJson(json);
        await prefs.setString(key, jsonEncode(json));
        return document;
      } catch (error) {
        debugPrint('[Legal] Using cached ${type.slug}: $error');
        final cached = prefs.getString(key);
        if (cached == null) return null;
        try {
          return LegalDocument.fromJson(
            Map<String, dynamic>.from(jsonDecode(cached) as Map),
          );
        } catch (_) {
          return null;
        }
      }
    });

/// What the signed-in person still has to accept. Fails open on purpose: with
/// no connection an emergency app must not trap anyone behind a prompt, and the
/// server refuses the protected actions (reporting, applying) regardless.
final consentStatusProvider = FutureProvider<List<PendingConsent>>((ref) async {
  if (ref.watch(currentUserProvider) == null) return const [];
  try {
    return await ref.read(legalRepositoryProvider).fetchPending();
  } catch (error) {
    debugPrint('[Legal] Consent status unavailable: $error');
    return const [];
  }
});
