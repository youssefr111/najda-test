import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/validators.dart';
import '../data/auth_repository.dart';

enum EmailAvailability { idle, checking, available, taken, error }

/// Live "is this email taken" hint. Debounced by construction: a new [email]
/// creates a new provider instance and disposes the previous one, which
/// cancels its pending delay.
final emailAvailabilityProvider =
    FutureProvider.autoDispose.family<EmailAvailability, String>((ref, email) async {
  final value = email.trim();
  if (!isValidEmailFormat(value)) return EmailAvailability.idle;

  var cancelled = false;
  ref.onDispose(() => cancelled = true);

  await Future<void>.delayed(const Duration(milliseconds: 500));
  if (cancelled) return EmailAvailability.idle;

  try {
    final taken = await ref.read(authRepositoryProvider).emailExists(value);
    return taken ? EmailAvailability.taken : EmailAvailability.available;
  } catch (_) {
    return EmailAvailability.error;
  }
});
