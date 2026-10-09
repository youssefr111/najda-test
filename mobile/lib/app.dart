import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/flavor.dart';
import 'core/l10n/l10n_x.dart';
import 'core/l10n/locale_controller.dart';
import 'core/l10n/theme_mode_controller.dart';
import 'core/network/api_client.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

class NajdaApp extends ConsumerWidget {
  const NajdaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final flavor = ref.watch(appConfigProvider).flavor;

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
      builder: (context, child) {
        final app = child ?? const SizedBox.shrink();
        // Non-production builds are visibly marked so a test APK is never
        // mistaken for the real app.
        return flavor.isProduction
            ? app
            : Banner(
                message: flavor.label.toUpperCase(),
                location: BannerLocation.topEnd,
                color: flavor == Flavor.qa ? Colors.orange : Colors.blueGrey,
                child: app,
              );
      },
    );
  }
}
