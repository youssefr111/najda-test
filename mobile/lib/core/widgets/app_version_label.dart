import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../config/flavor.dart';
import '../l10n/l10n_x.dart';
import '../theme/app_palette.dart';

final packageInfoProvider = FutureProvider<PackageInfo>(
  (ref) => PackageInfo.fromPlatform(),
);

/// "NAJDA · Version 1.0.0" -- shown on the auth screens and in Settings.
/// Non-production builds append their flavor so a test APK is never mistaken
/// for the real app.
class AppVersionLabel extends ConsumerWidget {
  const AppVersionLabel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final info = ref.watch(packageInfoProvider).value;
    if (info == null) return const SizedBox.shrink();

    final flavor = Flavor.current;
    final version = flavor.isProduction
        ? info.version
        : '${info.version} (${info.buildNumber}) · ${flavor.label}';

    return Text(
      context.l10n.appVersionLabel(version),
      textAlign: TextAlign.center,
      style: TextStyle(fontSize: 12, color: context.palette.textSubtle),
    );
  }
}
