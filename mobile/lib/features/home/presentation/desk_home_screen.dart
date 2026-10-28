import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../auth/application/auth_controller.dart';
import 'widgets/home_header.dart';

/// Home tab for Dispatcher / Hospital Staff / Admin accounts. Their consoles
/// live on the web, so there is no report screen here; the app still gives
/// them their account, settings and notifications, and points to the
/// dashboard from this tab.
class DeskHomeScreen extends ConsumerWidget {
  const DeskHomeScreen({super.key});

  Future<void> _openDashboard(WidgetRef ref) => launchUrl(
    Uri.parse(ref.read(appConfigProvider).webAppUrl),
    mode: LaunchMode.externalApplication,
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final user = ref.watch(currentUserProvider);
    final role = user == null ? '' : roleLabel(l10n, user.role);

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          HomeHeader(subtitle: role.isEmpty ? null : role),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: p.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: p.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.desktop_windows_outlined,
                    size: 28,
                    color: p.primary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.deskHomeTitle,
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.deskHomeBody(role),
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: p.textMuted,
                  ),
                ),
                const SizedBox(height: 20),
                AppButton(
                  label: l10n.webOnlyOpenDashboard,
                  icon: Icons.open_in_new_rounded,
                  onPressed: () => _openDashboard(ref),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
