import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/auth_controller.dart';
import '../data/kyc_repository.dart';
import '../domain/kyc.dart';

/// The signed-in person's verification state. Only people who can report have anything to verify; for everyone else
/// this is never read.
final kycStateProvider = FutureProvider.autoDispose<KycState>((ref) {
  ref.watch(currentUserProvider.select((user) => user?.id));
  return ref.watch(kycRepositoryProvider).status();
});

/// True while reporting is blocked until the person verifies (the server enforces it; this explains it first).
final kycBlocksReportingProvider = Provider.autoDispose<bool>(
  (ref) => ref.watch(kycStateProvider).value?.blocksReporting ?? false,
);

/// What is still missing before this person may report an emergency (the server enforces the same rules).
final reportRequirementsProvider = Provider.autoDispose<({bool email, bool phone, bool identity})>((ref) {
  final user = ref.watch(currentUserProvider);
  return (
    email: user != null && !user.emailVerified,
    phone: user != null && !user.phoneVerified,
    identity: ref.watch(kycBlocksReportingProvider),
  );
});

/// True while reporting is blocked: an unverified email or phone number, or an identity check the server requires.
final reportBlockedProvider = Provider.autoDispose<bool>((ref) {
  final missing = ref.watch(reportRequirementsProvider);
  return missing.email || missing.phone || missing.identity;
});