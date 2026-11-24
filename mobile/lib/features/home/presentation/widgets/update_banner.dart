import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/update/app_update.dart';

/// The version the person dismissed the banner for. Kept for this session only: the banner comes back on the next
/// launch, and for any newer release, so an available update never stays hidden for good. The "Update available"
/// tile in Settings is always there.
class _DismissedUpdate extends Notifier<String?> {
  @override
  String? build() => null;

  void dismiss(String version) => state = version;
}

final _dismissedUpdateProvider = NotifierProvider<_DismissedUpdate, String?>(_DismissedUpdate.new);

/// "A newer version is available", shown under the header of the home screens until the person updates. Quiet by
/// design: it never covers the screen or interrupts a report or a mission, and tapping it starts the download.
class UpdateBanner extends ConsumerWidget {
  const UpdateBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final update = ref.watch(availableUpdateProvider).value;
    final dismissed = ref.watch(_dismissedUpdateProvider);
    if (update == null || dismissed == update.version) return const SizedBox.shrink();

    final l10n = context.l10n;
    final p = context.palette;
    final sizeMb = update.sizeMb;
    final version = l10n.updateVersionLabel(update.version);
    final details = sizeMb == null ? version : '$version · ${l10n.updateSizeMb(sizeMb)}';

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Material(
        color: p.primary.withValues(alpha: 0.08),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: p.primary.withValues(alpha: 0.3)),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => openUpdate(update),
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(14, 10, 6, 10),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: p.primary.withValues(alpha: 0.12), shape: BoxShape.circle),
                  child: Icon(Icons.system_update_rounded, color: p.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.updateAvailableTitle,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: p.text),
                      ),
                      Text(details, style: TextStyle(fontSize: 12, color: p.textMuted)),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => openUpdate(update),
                  child: Text(l10n.updateAction, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                IconButton(
                  tooltip: l10n.updateDismiss,
                  visualDensity: VisualDensity.compact,
                  icon: Icon(Icons.close_rounded, size: 18, color: p.textMuted),
                  onPressed: () => ref.read(_dismissedUpdateProvider.notifier).dismiss(update.version),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}