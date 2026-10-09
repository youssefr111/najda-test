import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../account/data/user_repository.dart';
import '../data/auth_repository.dart';
import '../domain/app_user.dart';
import '../domain/auth_state.dart';

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

/// Bridges Firebase's auth state and the backend profile into one [AuthState]
/// that the router and every screen read. Mounted for the app's lifetime.
class AuthController extends Notifier<AuthState> {
  /// If Firebase's very first auth event never fires (a broken persistence
  /// init is one realistic cause) the app would sit on a spinner forever. After
  /// this long we fall back to "signed out": worst case a real session shows
  /// the login screen once.
  static const _bootTimeout = Duration(seconds: 6);
  static const _profileAttempts = 3;

  bool _resolved = false;

  @override
  AuthState build() {
    final auth = ref.watch(firebaseAuthProvider);

    final bootTimer = Timer(_bootTimeout, () {
      if (_resolved) return;
      _resolved = true;
      state = const AuthUnauthenticated();
    });
    final subscription = auth.authStateChanges().listen(_onFirebaseUser);

    ref.onDispose(() {
      bootTimer.cancel();
      unawaited(subscription.cancel());
    });
    return const AuthLoading();
  }

  Future<void> _onFirebaseUser(Object? firebaseUser) async {
    _resolved = true;
    if (firebaseUser == null) {
      state = const AuthUnauthenticated();
      return;
    }
    state = const AuthCheckingProfile();
    await refreshProfile();
  }

  /// Re-reads `/api/auth/me`. While already authenticated a failed refresh
  /// keeps the existing profile instead of blanking the app.
  Future<void> refreshProfile() async {
    final auth = ref.read(firebaseAuthProvider);
    final repository = ref.read(userRepositoryProvider);

    for (var attempt = 1; attempt <= _profileAttempts; attempt++) {
      try {
        final user = await repository.fetchMe();
        // The user may have signed out while the request was in flight.
        if (auth.currentUser == null) return;
        state = Authenticated(user);
        return;
      } on ApiException catch (e) {
        if (auth.currentUser == null) return;
        if (e.status == 403) {
          state = const AuthUnregistered();
          return;
        }
        if (attempt == _profileAttempts) {
          if (state is! Authenticated) state = AuthProfileError(e.message);
          return;
        }
        await Future<void>.delayed(const Duration(seconds: 1));
      }
    }
  }

  /// Retry from the profile-error screen.
  Future<void> retry() async {
    state = const AuthCheckingProfile();
    await refreshProfile();
  }

  /// Pushes an updated profile (returned by a mutation) into the session.
  void updateUser(AppUser user) => state = Authenticated(user);

  Future<void> signOut() => ref.read(authRepositoryProvider).signOut();
}

/// Convenience: the signed-in user, or null.
final currentUserProvider = Provider<AppUser?>((ref) {
  final auth = ref.watch(authControllerProvider);
  return auth is Authenticated ? auth.user : null;
});
