import 'app_user.dart';

/// What the session currently looks like. Drives every redirect in the router.
sealed class AuthState {
  const AuthState();
}

/// Waiting for Firebase's first auth event.
final class AuthLoading extends AuthState {
  const AuthLoading();
}

final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// A Firebase user exists and `/api/auth/me` is in flight.
final class AuthCheckingProfile extends AuthState {
  const AuthCheckingProfile();
}

/// A Firebase user exists but the backend has no account yet (HTTP 403). This
/// is the brief window during Google registration, before the bootstrap call.
final class AuthUnregistered extends AuthState {
  const AuthUnregistered();
}

/// `/api/auth/me` failed for a reason other than "no account" (offline, 5xx).
final class AuthProfileError extends AuthState {
  const AuthProfileError(this.message);

  final String message;
}

final class Authenticated extends AuthState {
  const Authenticated(this.user);

  final AppUser user;
}
