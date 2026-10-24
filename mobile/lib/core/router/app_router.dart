import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/kyc/presentation/verify_account_screen.dart';
import '../../features/account/presentation/account_screen.dart';
import '../../features/applications/presentation/become_responder_screen.dart';
import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/domain/app_user.dart';
import '../../features/auth/domain/auth_state.dart';
import '../../features/auth/domain/role.dart';
import '../../features/auth/presentation/complete_profile_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/profile_error_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/home/presentation/citizen_home_screen.dart';
import '../../features/home/presentation/field_home_screen.dart';
import '../../features/home/presentation/desk_home_screen.dart';
import '../../features/incident/domain/incident.dart';
import '../../features/incident/presentation/incident_detail_screen.dart';
import '../../features/incident/presentation/incidents_screen.dart';
import '../../features/incident/presentation/report_screen.dart';
import '../../features/legal/presentation/about_screen.dart';
import '../../features/medical/application/medical_providers.dart';
import '../../features/medical/presentation/medical_onboarding_screen.dart';
import '../../features/legal/presentation/privacy_screen.dart';
import '../../features/legal/presentation/support_screen.dart';
import '../../features/legal/presentation/terms_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/responder/presentation/mission_detail_screen.dart';
import '../../features/responder/presentation/shift_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/status/presentation/status_screen.dart';
import '../widgets/states.dart';
import 'app_shell.dart';
import 'auth_transition.dart';

abstract final class Routes {
  static const splash = '/splash';
  static const login = '/login';
  static const register = '/register';
  static const completeProfile = '/complete-profile';
  static const profileError = '/profile-error';
  static const desk = '/desk';
  static const medicalOnboarding = '/medical-onboarding';
  static const settings = '/settings';
  static const notifications = '/notifications';
  static const citizen = '/citizen';
  static const responder = '/responder';

  /// Public pages: reachable signed-out (from the register form's terms link)
  /// and while signed in.
  static const legalPages = {
    '/about',
    '/privacy',
    '/terms',
    '/support',
    '/status',
  };
}

final routerProvider = Provider<GoRouter>((ref) {
  // Re-evaluate every redirect whenever the session changes.
  final refresh = ValueNotifier<int>(0);
  ref
    ..listen<AuthState>(authControllerProvider, (_, _) => refresh.value++)
    ..listen<bool>(medicalOnboardingPendingProvider, (_, _) => refresh.value++)
    ..onDispose(refresh.dispose);

  final rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

  return GoRouter(
    navigatorKey: rootKey,
    initialLocation: Routes.splash,
    refreshListenable: refresh,
    redirect: (context, state) => _redirect(
      ref.read(authControllerProvider),
      state.matchedLocation,
      medicalOnboardingPending: ref.read(medicalOnboardingPendingProvider),
    ),
    routes: [
      GoRoute(path: Routes.splash, builder: (_, _) => const SplashScreen()),
      GoRoute(
        path: Routes.login,
        pageBuilder: (_, state) =>
            AuthTransitions.base(state, const LoginScreen()),
      ),
      GoRoute(
        path: Routes.register,
        pageBuilder: (_, state) =>
            AuthTransitions.push(state, const RegisterScreen()),
      ),
      GoRoute(
        path: Routes.profileError,
        builder: (_, _) => const ProfileErrorScreen(),
      ),
      GoRoute(
        path: Routes.completeProfile,
        builder: (_, _) => Consumer(
          builder: (context, ref, _) {
            final user = ref.watch(currentUserProvider);
            return user == null
                ? const LoadingView()
                : CompleteProfileScreen(user: user);
          },
        ),
      ),

      GoRoute(
        path: Routes.medicalOnboarding,
        builder: (_, _) => const MedicalOnboardingScreen(),
      ),

      // Pages opened from anywhere (settings, bell, legal links).
      GoRoute(path: Routes.settings, builder: (_, _) => const SettingsScreen()),
      GoRoute(
        path: Routes.notifications,
        builder: (_, _) => const NotificationsScreen(),
      ),
      GoRoute(path: '/about', builder: (_, _) => const AboutScreen()),
      GoRoute(path: '/privacy', builder: (_, _) => const PrivacyScreen()),
      GoRoute(path: '/terms', builder: (_, _) => const TermsScreen()),
      GoRoute(path: '/support', builder: (_, _) => const SupportScreen()),
      GoRoute(path: '/status', builder: (_, _) => const StatusScreen()),

      // Full-screen responder flows cover the tab bar. They live outside the
      // shell because a branch's direct routes cannot use the root navigator key.
      GoRoute(
        path: '${Routes.responder}/missions/:id',
        builder: (_, state) => MissionDetailScreen(
          missionId: int.parse(state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '${Routes.responder}/shift',
        builder: (_, _) => const ShiftScreen(),
      ),

      // ---------------- Citizen ----------------
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.citizen,
                builder: (_, _) => const CitizenHomeScreen(),
                routes: [
                  // Full-screen flows cover the tab bar.
                  GoRoute(
                    path: 'verify',
                    parentNavigatorKey: rootKey,
                    builder: (_, _) => const VerifyAccountScreen(),
                  ),
                  GoRoute(
                    path: 'report',
                    parentNavigatorKey: rootKey,
                    builder: (_, state) => ReportScreen(
                      initialCategory: _categoryFrom(
                        state.uri.queryParameters['category'],
                      ),
                    ),
                  ),
                  GoRoute(
                    path: 'incident/:id',
                    parentNavigatorKey: rootKey,
                    builder: (_, state) => IncidentDetailScreen(
                      incidentId: int.parse(state.pathParameters['id']!),
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '${Routes.citizen}/account',
                builder: (_, _) => const AccountScreen(),
                routes: [
                  GoRoute(
                    path: 'become-responder',
                    parentNavigatorKey: rootKey,
                    builder: (_, _) => const BecomeResponderScreen(),
                  ),
                  GoRoute(
                    path: 'incidents',
                    parentNavigatorKey: rootKey,
                    builder: (_, _) => const IncidentsScreen(),
                    routes: [
                      GoRoute(
                        path: ':id',
                        parentNavigatorKey: rootKey,
                        builder: (_, state) => IncidentDetailScreen(
                          incidentId: int.parse(state.pathParameters['id']!),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),

      // ---------------- Desk roles (dispatcher / hospital / admin) ----------------
      // No report or field screens: just Home (a pointer to the web dashboard)
      // and Account, with Settings and Notifications reachable from anywhere.
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.desk,
                builder: (_, _) => const DeskHomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '${Routes.desk}/account',
                builder: (_, _) => const AccountScreen(),
              ),
            ],
          ),
        ],
      ),

      // ---------------- Responder ----------------
      // Home is the same as a citizen's (report an emergency, follow your reports): a responder is also a
      // member of the public. Their shift and missions are the middle tab.
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.responder,
                builder: (_, _) => const CitizenHomeScreen(),
                routes: [
                  GoRoute(
                    path: 'verify',
                    parentNavigatorKey: rootKey,
                    builder: (_, _) => const VerifyAccountScreen(),
                  ),
                  GoRoute(
                    path: 'report',
                    parentNavigatorKey: rootKey,
                    builder: (_, state) => ReportScreen(
                      initialCategory: _categoryFrom(
                        state.uri.queryParameters['category'],
                      ),
                    ),
                  ),
                  GoRoute(
                    path: 'incident/:id',
                    parentNavigatorKey: rootKey,
                    builder: (_, state) => IncidentDetailScreen(
                      incidentId: int.parse(state.pathParameters['id']!),
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '${Routes.responder}/work',
                builder: (_, _) => const FieldHomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '${Routes.responder}/account',
                builder: (_, _) => const AccountScreen(),
                routes: [
                  GoRoute(
                    path: 'incidents',
                    parentNavigatorKey: rootKey,
                    builder: (_, _) => const IncidentsScreen(),
                    routes: [
                      GoRoute(
                        path: ':id',
                        parentNavigatorKey: rootKey,
                        builder: (_, state) => IncidentDetailScreen(
                          incidentId: int.parse(state.pathParameters['id']!),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

IncidentCategory? _categoryFrom(String? wire) =>
    IncidentCategory.values.where((c) => c.wire == wire).firstOrNull;

/// Single source of truth for "where may this session be right now".
String? _redirect(
  AuthState auth,
  String location, {
  required bool medicalOnboardingPending,
}) {
  final inAuth = location == Routes.login || location == Routes.register;
  final isLegal = Routes.legalPages.contains(location);

  return switch (auth) {
    AuthLoading() => location == Routes.splash ? null : Routes.splash,
    AuthUnauthenticated() ||
    AuthUnregistered() => inAuth || isLegal ? null : Routes.login,
    // Keep the auth screens mounted while a sign-in resolves (they show their
    // own overlay); elsewhere show the splash.
    AuthCheckingProfile() =>
      inAuth || location == Routes.splash ? null : Routes.splash,
    AuthProfileError() =>
      location == Routes.profileError ? null : Routes.profileError,
    Authenticated(:final user) => _authenticated(
      user,
      location,
      inAuth: inAuth,
      isLegal: isLegal,
      medicalOnboardingPending: medicalOnboardingPending,
    ),
  };
}

String? _authenticated(
  AppUser user,
  String location, {
  required bool inAuth,
  required bool isLegal,
  required bool medicalOnboardingPending,
}) {
  if (!user.profileCompleted) {
    return location == Routes.completeProfile || isLegal
        ? null
        : Routes.completeProfile;
  }

  // The optional medical-profile step, once, right after a citizen registers.
  if (medicalOnboardingPending && user.role == Role.citizen) {
    return location == Routes.medicalOnboarding || isLegal
        ? null
        : Routes.medicalOnboarding;
  }

  final home = _homeFor(user);
  if (inAuth ||
      location == Routes.splash ||
      location == Routes.completeProfile ||
      location == Routes.profileError ||
      location == Routes.medicalOnboarding ||
      location == '/') {
    return home;
  }

  // Role guard: each role stays in its own area.
  for (final area in [Routes.citizen, Routes.responder, Routes.desk]) {
    if (area != home && location.startsWith(area)) return home;
  }
  return null;
}

String _homeFor(AppUser user) {
  if (user.role == Role.citizen) return Routes.citizen;
  return user.role.isResponder ? Routes.responder : Routes.desk;
}
