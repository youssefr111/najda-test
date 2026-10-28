import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_card.dart';
import '../../auth/application/auth_controller.dart';
import '../../responder/application/responder_providers.dart';
import '../../responder/presentation/missions_screen.dart';
import 'widgets/home_header.dart';

/// Responder home: who you are, whether you are on shift, then your missions.
/// The shift card opens the full shift screen (start / join / end / crew).
class FieldHomeScreen extends ConsumerWidget {
  const FieldHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              context.pagePadding,
              context.pagePadding,
              context.pagePadding,
              12,
            ),
            child: Column(
              children: [
                HomeHeader(
                  subtitle: user == null
                      ? null
                      : roleLabel(context.l10n, user.role),
                ),
                const SizedBox(height: 16),
                const _ShiftCard(),
              ],
            ),
          ),
          const Expanded(child: MissionsScreen()),
        ],
      ),
    );
  }
}

class _ShiftCard extends ConsumerWidget {
  const _ShiftCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final shift = ref.watch(myShiftProvider);

    final (IconData icon, Color color, String title, String? subtitle) = shift
        .when<(IconData, Color, String, String?)>(
          loading: () =>
              (Icons.schedule, p.textMuted, l10n.shiftStatusCardLoading, null),
          error: (_, _) =>
              (Icons.error_outline, p.danger, l10n.commonError, null),
          data: (assignment) {
            if (assignment == null) {
              return (
                Icons.power_settings_new,
                p.textMuted,
                l10n.shiftStatusCardOffDuty,
                l10n.shiftStatusCardStartShift,
              );
            }
            final since = MaterialLocalizations.of(context).formatTimeOfDay(
              TimeOfDay.fromDateTime(assignment.startTime.toLocal()),
            );
            return (
              Icons.radio_button_checked,
              p.success,
              l10n.shiftStatusCardOnDuty(assignment.unitPlateNumber),
              l10n.shiftStatusCardSince(since),
            );
          },
        );

    return AppCard(
      onTap: () => context.push('/responder/shift'),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 13, color: p.textMuted),
                  ),
              ],
            ),
          ),
          Icon(
            Directionality.of(context) == TextDirection.rtl
                ? Icons.chevron_left_rounded
                : Icons.chevron_right_rounded,
            color: p.textMuted,
          ),
        ],
      ),
    );
  }
}
