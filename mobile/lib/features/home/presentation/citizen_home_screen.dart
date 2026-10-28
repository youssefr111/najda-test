import '../../kyc/application/kyc_providers.dart';
import '../../kyc/presentation/kyc_widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/location/location_sharing.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../incident/application/active_incident_provider.dart';
import '../../incident/application/outbox_controller.dart';
import '../../incident/domain/incident.dart';
import '../../guidance/application/guidance_provider.dart';
import 'widgets/home_header.dart';
import 'widgets/outbox_banner.dart';
import 'widgets/sos_button.dart';
import 'dart:async';

/// The citizen's landing screen: SOS, one-tap category reports, and the
/// current report (if any) one tap away.
class CitizenHomeScreen extends ConsumerWidget {
  const CitizenHomeScreen({super.key});

  /// One active report at a time: if there is one, open it instead of starting
  /// another.
  /// [category] is only passed by the explicit quick-report buttons; the generic
  /// SOS leaves it out so the form keeps whatever the person had chosen.
  Future<void> _openReport(
    BuildContext context,
    WidgetRef ref,
    IncidentCategory? category,
  ) async {
    // Verification first: when it is missing it is the real reason nothing can be sent, and the
    // verification screen explains it (with the emergency numbers). Offline, this fails open:
    // the server still enforces it.
    final blocked = await ref
        .read(kycStateProvider.future)
        .then((state) => state.blocksReporting, onError: (_) => false);
    if (!context.mounted) return;
    if (blocked) {
      unawaited(context.push('${areaOf(context)}/verify'));
      return;
    }

    // One active report at a time. A report the server refused says why; otherwise it is on its way.
    final outbox = ref.read(outboxControllerProvider);
    if (outbox.hasReport) {
      final reason = outbox.phase == OutboxPhase.rejected ? outbox.error : null;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(reason ?? context.l10n.pendingAlready)),
        );
      return;
    }
    final active = ref.read(activeIncidentProvider);
    if (active != null) {
      unawaited(context.push('${areaOf(context)}/incident/${active.id}'));
      return;
    }
    unawaited(
      context.push(
        category == null
            ? '${areaOf(context)}/report'
            : '${areaOf(context)}/report?category=${category.wire}',
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final sosSize = context.adaptive<double>(
      compact: 190,
      regular: 230,
      tablet: 270,
    );

    ref.read(guidanceProvider); // warm the offline cache before it is needed

    // A report that was waiting for a connection has just been delivered.
    ref.listen(
      outboxControllerProvider.select((state) => state.sentIncidentId),
      (_, id) {
        if (id == null) return;
        final failed = ref.read(outboxControllerProvider).failedUploads;
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(
                failed > 0
                    ? l10n.mediaGalleryUploadsFailed(failed)
                    : l10n.outboxDelivered,
              ),
              action: SnackBarAction(
                label: l10n.citizenReportViewReport,
                onPressed: () =>
                    context.push('${areaOf(context)}/incident/$id'),
              ),
            ),
          );
        ref.read(outboxControllerProvider.notifier).acknowledgeSent();
      },
    );

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const HomeHeader(),
          const SizedBox(height: 16),
          const _LocationStatusChip(),
          const _KycBanner(),
          const OutboxBanner(),
          const _ActiveReportBanner(),
          SizedBox(height: context.adaptive<double>(compact: 20, regular: 32)),
          Center(
            child: SosButton(
              size: sosSize,
              label: l10n.sos,
              hint: l10n.holdToAlert,
              onTriggered: () => _openReport(context, ref, null),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            l10n.sosHint,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, height: 1.45, color: p.textMuted),
          ),
          SizedBox(height: context.adaptive<double>(compact: 24, regular: 32)),
          Text(
            l10n.quickReport,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              for (final (category, icon, label) in [
                (
                  IncidentCategory.medical,
                  Icons.medical_services_outlined,
                  l10n.medical,
                ),
                (
                  IncidentCategory.fire,
                  Icons.local_fire_department_outlined,
                  l10n.fire,
                ),
                (
                  IncidentCategory.police,
                  Icons.local_police_outlined,
                  l10n.police,
                ),
              ])
                Expanded(
                  child: _QuickReportItem(
                    icon: icon,
                    label: label,
                    onTap: () => _openReport(context, ref, category),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

/// Tells the truth about location: green when NAJDA can locate the citizen,
/// amber (and tappable) when something needs attention.
class _LocationStatusChip extends ConsumerWidget {
  const _LocationStatusChip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final readiness = ref.watch(locationReadinessProvider).value;

    final Widget child;
    if (readiness == null) {
      child = const SizedBox(width: double.infinity);
    } else {
      final ok = readiness == LocationReadiness.ready;
      final color = ok ? p.success : p.warning;
      // A compact, centred pill (not a full-width block), so the SOS button
      // stays near the top of the screen.
      child = Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Center(
          child: Material(
            color: color.withValues(alpha: 0.13),
            shape: const StadiumBorder(),
            child: InkWell(
              customBorder: const StadiumBorder(),
              onTap: ok ? null : () => context.push('/settings'),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 8,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      ok
                          ? Icons.verified_user_outlined
                          : Icons.location_off_outlined,
                      size: 16,
                      color: color,
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        ok
                            ? l10n.protectedLocationOn
                            : l10n.homeLocationAttention,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: p.text,
                        ),
                      ),
                    ),
                    if (!ok)
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: p.textMuted,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    return AnimatedSize(
      duration: const Duration(milliseconds: 200),
      alignment: Alignment.topCenter,
      child: child,
    );
  }
}

class _ActiveReportBanner extends ConsumerWidget {
  const _ActiveReportBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final incident = ref.watch(activeIncidentProvider);
    if (incident == null) return const SizedBox.shrink();

    final l10n = context.l10n;
    final p = context.palette;

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Material(
        color: p.primary.withValues(alpha: 0.1),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: p.primary.withValues(alpha: 0.3)),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () =>
              context.push('${areaOf(context)}/incident/${incident.id}'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(Icons.crisis_alert, color: p.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.activeReport,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: p.primary,
                        ),
                      ),
                      Text(
                        incidentStatusLabel(l10n, incident.status),
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: p.text,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: p.primary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickReportItem extends StatelessWidget {
  const _QuickReportItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: p.surface,
                shape: BoxShape.circle,
                border: Border.all(color: p.border),
              ),
              child: Icon(icon, color: p.primary, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// "Verify your identity to report an emergency": shown only while reporting is actually blocked.
class _KycBanner extends ConsumerWidget {
  const _KycBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(reportBlockedProvider)) return const SizedBox.shrink();
    final l10n = context.l10n;
    final p = context.palette;

    return KycAutoRefresh(
      child: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Material(
          color: p.warning.withValues(alpha: 0.12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: p.warning.withValues(alpha: 0.4)),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => context.push('${areaOf(context)}/verify'),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Icon(Icons.verified_user_outlined, color: p.warning),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.kycBannerTitle,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                        Text(
                          l10n.kycBannerBody,
                          style: TextStyle(fontSize: 12, color: p.textMuted),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: p.warning),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
