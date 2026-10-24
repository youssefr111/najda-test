import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../settings/presentation/widgets/settings_widgets.dart';
import '../../application/medical_providers.dart';

/// Shown on the report form only to citizens who gave standing consent to share
/// their profile. Lets them withhold it for this one report -- e.g. when
/// calling for someone else, whose history theirs would wrongly describe (and
/// leak).
class MedicalSharingToggle extends ConsumerWidget {
  const MedicalSharingToggle({
    required this.value,
    required this.onChanged,
    super.key,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shares = ref.watch(
      medicalProfileProvider.select(
        (profile) => profile.value?.shareWithResponders ?? false,
      ),
    );
    if (!shares) return const SizedBox.shrink();

    final l10n = context.l10n;
    final p = context.palette;

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: p.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.monitor_heart_outlined, color: p.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.reportMedicalSharingLabel,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    l10n.reportMedicalSharingHint,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.35,
                      color: p.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            SettingsSwitch(value: value, onChanged: onChanged),
          ],
        ),
      ),
    );
  }
}
