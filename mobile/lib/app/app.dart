import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';

import '../core/l10n/l10n_x.dart';
import '../core/l10n/locale_controller.dart';
import '../core/l10n/theme_mode_controller.dart';
import '../core/router/app_router.dart';
import '../core/widgets/root_messenger.dart';
import '../core/widgets/in_app_notification.dart';
import '../core/status/backend_status_banner.dart';
import '../core/theme/app_theme.dart';
import 'app_lock_gate.dart';
import 'location_prewarm.dart';
import 'outbox_sync.dart';
import 'push_lifecycle.dart';
import 'update_notifier.dart';
import 'legal_consent_gate.dart';

class NajdaApp extends ConsumerWidget {
  const NajdaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {

    return MaterialApp.router(
      title: 'NAJDA',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ref.watch(themeModeControllerProvider),
      locale: ref.watch(localeControllerProvider),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      routerConfig: ref.watch(routerProvider),
      scaffoldMessengerKey: ref.watch(rootMessengerKeyProvider),
      builder: (context, child) {
        // Respect the user's font-size setting, but cap it so layouts built for
        // phones never break at the largest accessibility sizes.
        final app = MediaQuery.withClampedTextScaling(
          minScaleFactor: 0.9,
          maxScaleFactor: 1.3,
          // A transparent Material above the Navigator is the safety net: any
          // page, dialog or overlay always has a Material ancestor and a
          // default text style, so nothing can render with the yellow debug
          // underline or throw "No Material widget found".
          child: Material(
            type: MaterialType.transparency,
            child: OutboxSync(
              child: PushLifecycle(
                child: UpdateNotifier(
                  child: LocationPrewarm(
                    child: child ?? const SizedBox.shrink(),
                  ),
                ),
              ),
            ),
          ),
        );

        // The status pill floats over the app (nothing is pushed down), and the
        // lock screen, when active, covers everything including the pill.
        final withOverlays = AppLockGate(
          child: LegalConsentGate(
            child: Stack(
              children: [
                Positioned.fill(child: app),
                const Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: BackendStatusBanner(),
                ),
                const Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: InAppNotificationHost(),
                ),
              ],
            ),
          ),
        );

        final isDark = Theme.of(context).brightness == Brightness.dark;
        final iconBrightness = isDark ? Brightness.light : Brightness.dark;

        // Transparent system bars let the page background show through, and
        // the icon brightness follows the active theme.
        final styled = AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: iconBrightness, // Android
            statusBarBrightness: isDark
                ? Brightness.dark
                : Brightness.light, // iOS
            systemNavigationBarColor: Colors.transparent,
            systemNavigationBarIconBrightness: iconBrightness,
            systemNavigationBarContrastEnforced: false,
            systemStatusBarContrastEnforced: false,
          ),
          child: withOverlays,
        );
        return styled;
      },
    );
  }
}
