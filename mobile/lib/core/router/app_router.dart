import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/presentation/account_screen.dart';
import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/domain/auth_state.dart';
import '../../features/auth/domain/app_user.dart';
import '../../features/auth/presentation/complete_profile_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/profile_error_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/incident/presentation/incident_detail_screen.dart';
import '../../features/incident/presentation/incidents_screen.dart';
import '../../features/incident/presentation/report_screen.dart';
import '../../features/legal/presentation/about_screen.dart';
import '../../features/legal/presentation/privacy_screen.dart';
import '../../features/legal/presentation/support_screen.dart';
import '../../features/legal/presentation/terms_screen.dart';
import '../../features/responder/presentation/mission_detail_screen.dart';
import '../../features/responder/presentation/missions_screen.dart';
import '../../features/responder/presentation/shift_screen.dart';
import '../l10n/l10n_x.dart';
import '../widgets/states.dart';
import 'app_shell.dart';

abstract final class Routes {
  static const splash = '/splash';
  static const login = '/login';
  static const register = '/register';
  static const completeProfile = '/complete-profile';
  static const profileError = '/profile-error';
  static const citizen = '/citizen';
  static const responder = '/responder';

  static const legalPages = {'/about', '/privacy', '/terms', '/support'};
}

final routerProvider = Provider<GoRouter>((ref) {
  // Re-evaluate every redirect whenever the session changes.
  final refresh = ValueNotifier<int>(0);
  ref
    ..listen<AuthState>(authControllerProvider, (_, __) => refresh.value++)
    ..onDispose(refresh.dispose);

  final rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

  return GoRouter(
    navigatorKey: rootKey,
    initialLocation: Routes.splash,
    refreshListenable: refresh,
    redirect: (context, state) => _redirect(ref.read(authControllerProvider), state.matchedLocation),
    routes: [
      GoRoute(path: Routes.splash, builder: (_, __) => const _Splash()),
      GoRoute(path: Routes.login, builder: (_, __) => const LoginScreen()),
      GoRoute(path: Routes.register, builder: (_, __) => const RegisterScreen()),
      GoRoute(path: Routes.profileError, builder: (_, __) => const ProfileErrorScreen()),
      GoRoute(
        path: Routes.completeProfile,
        builder: (context, __) => Consumer(
          builder: (context, ref, _) {
            final user = ref.watch(currentUserProvider);
            return user == null ? const LoadingView() : CompleteProfileScreen(user: user);
          },
        ),
      ),

      // Static pages, reachable from the account screen.
      GoRoute(path: '/about', builder: (_, __) => const AboutScreen()),
      GoRoute(path: '/privacy', builder: (_, __) => const PrivacyScreen()),
      GoRoute(path: '/terms', builder: (_, __) => const TermsScreen()),
      GoRoute(path: '/support', builder: (_, __) => const SupportScreen()),

      // ---------------- Citizen ----------------
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell, kind: ShellKind.citizen),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.citizen,
                builder: (_, __) => const ReportScreen(),
                routes: [
                  GoRoute(
                    path: 'incident/:id',
                    builder: (_, state) =>
                        IncidentDetailScreen(incidentId: int.parse(state.pathParameters['id']!)),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '${Routes.citizen}/account',
                builder: (_, __) => const AccountScreen(),
                routes: [
                  GoRoute(
                    path: 'incidents',
                    builder: (_, __) => const IncidentsScreen(),
                    routes: [
                      GoRoute(
                        path: ':id',
                        builder: (_, state) =>
                            IncidentDetailScreen(incidentId: int.parse(state.pathParameters['id']!)),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),

      // ---------------- Responder ----------------
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell, kind: ShellKind.responder),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.responder,
                builder: (_, __) => const MissionsScreen(),
                routes: [
                  GoRoute(
                    path: 'missions/:id',
                    builder: (_, state) =>
                        MissionDetailScreen(missionId: int.parse(state.pathParameters['id']!)),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '${Routes.responder}/shift', builder: (_, __) => const ShiftScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '${Routes.responder}/account', builder: (_, __) => const AccountScreen()),
            ],
          ),
        ],
      ),
    ],
  );
});

/// Single source of truth for "where may this session be right now".
String? _redirect(AuthState auth, String location) {
  final inAuth = location == Routes.login || location == Routes.register;
  final isLegal = Routes.legalPages.contains(location);
  final home = switch (auth) {
    Authenticated(:final user) => _homeFor(user),
    _ => Routes.login,
  };

  return switch (auth) {
    AuthLoading() => location == Routes.splash ? null : Routes.splash,
    AuthUnauthenticated() || AuthUnregistered() => inAuth || isLegal ? null : Routes.login,
    // Keep the auth screens mounted while a sign-in resolves (they show their
    // own overlay); elsewhere show the splash.
    AuthCheckingProfile() => inAuth || location == Routes.splash ? null : Routes.splash,
    AuthProfileError() => location == Routes.profileError ? null : Routes.profileError,
    Authenticated(:final user) => _authenticated(user, location, home, inAuth, isLegal),
  };
}

String? _authenticated(AppUser user, String location, String home, bool inAuth, bool isLegal) {
  if (!user.profileCompleted) {
    return location == Routes.completeProfile || isLegal ? null : Routes.completeProfile;
  }
  if (inAuth ||
      location == Routes.splash ||
      location == Routes.completeProfile ||
      location == Routes.profileError ||
      location == '/') {
    return home;
  }
  // Role guard: each role stays in its own area.
  if (location.startsWith(Routes.responder) && !user.role.isResponder) return Routes.citizen;
  if (location.startsWith(Routes.citizen) && user.role.isResponder) return Routes.responder;
  return null;
}

String _homeFor(AppUser user) => user.role.isResponder ? Routes.responder : Routes.citizen;

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) => LoadingView(label: context.l10n.commonLoading);
}
