import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/auth_controller.dart';
import '../../auth/domain/auth_state.dart';
import '../data/medical_repository.dart';
import '../domain/medical_profile.dart';

/// The signed-in user's medical profile. Bound to the user id so signing out
/// and into another account never shows the previous person's data.
final medicalProfileProvider =
    AsyncNotifierProvider<MedicalProfileController, MedicalProfile>(
      MedicalProfileController.new,
    );

class MedicalProfileController extends AsyncNotifier<MedicalProfile> {
  @override
  Future<MedicalProfile> build() {
    ref.watch(currentUserProvider.select((user) => user?.id));
    return ref.read(medicalRepositoryProvider).get();
  }

  Future<void> save(MedicalProfile profile) async {
    final saved = await ref.read(medicalRepositoryProvider).save(profile);
    state = AsyncData(saved);
  }

  Future<void> delete() async {
    await ref.read(medicalRepositoryProvider).delete();
    state = const AsyncData(MedicalProfile.empty);
  }
}

/// The patient's profile for an incident, for responders. A 403 (not a role
/// that may see it, or the incident has closed) is handled by the panel.
final incidentMedicalProfileProvider = FutureProvider.autoDispose
    .family<IncidentMedicalProfile, int>(
      (ref, incidentId) =>
          ref.watch(medicalRepositoryProvider).forIncident(incidentId),
    );

/// Set right after a successful registration so the optional "add your medical
/// profile" step is shown once. In memory only (like the web): it never nags
/// on later launches, and Skip is always available.
final medicalOnboardingPendingProvider =
    NotifierProvider<MedicalOnboardingPending, bool>(
      MedicalOnboardingPending.new,
    );

class MedicalOnboardingPending extends Notifier<bool> {
  @override
  bool build() {
    // Signing out ends the step: it must never carry over to the next account.
    ref.listen(authControllerProvider, (_, next) {
      if (next is AuthUnauthenticated) state = false;
    });
    return false;
  }

  void set({required bool pending}) => state = pending;
}
