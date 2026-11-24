import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/location/location_service.dart';
import '../../../../core/push/push_notifications.dart';
import '../../../../core/push/push_os_status.dart';
import '../../../../core/theme/app_palette.dart';

/// "Notifications are off", shown under the header of the home screens while the phone blocks NAJDA's
/// notifications but the app is set to use them. Without this the app looks fine, yet a mission offer or an
/// update would only ever appear when the app is already open. Tapping it opens the phone's settings for NAJDA.
class PushBlockedBanner extends ConsumerWidget {
  const PushBlockedBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wantsPush = ref.watch(pushNotificationsEnabledProvider);
    final allowed = ref.watch(pushOsAllowedProvider).value ?? true;
    if (!wantsPush || allowed) return const SizedBox.shrink();

    final l10n = context.l10n;
    final p = context.palette;
    void openSettings() => ref.read(locationServiceProvider).openAppSettings();

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Material(
        color: p.warning.withValues(alpha: 0.12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: p.warning.withValues(alpha: 0.45)),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: openSettings,
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(14, 10, 8, 10),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: p.warning.withValues(alpha: 0.18), shape: BoxShape.circle),
                  child: Icon(Icons.notifications_off_outlined, color: p.warning, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.pushBlockedTitle,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: p.text),
                      ),
                      Text(l10n.pushBlockedBody, style: TextStyle(fontSize: 12, color: p.textMuted)),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: openSettings,
                  child: Text(l10n.openSettings, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}