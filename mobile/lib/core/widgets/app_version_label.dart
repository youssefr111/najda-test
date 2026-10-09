import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../config/flavor.dart';
import '../theme/app_palette.dart';

final packageInfoProvider = FutureProvider<PackageInfo>((ref) => PackageInfo.fromPlatform());

class AppVersionLabel extends ConsumerWidget {
  const AppVersionLabel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final info = ref.watch(packageInfoProvider).valueOrNull;
    if (info == null) return const SizedBox.shrink();

    final flavor = Flavor.current;
    final suffix = flavor.isProduction ? '' : ' · ${flavor.label}';
    return Text(
      'v${info.version} (${info.buildNumber})$suffix',
      style: TextStyle(fontSize: 12, color: context.palette.textSubtle),
    );
  }
}
