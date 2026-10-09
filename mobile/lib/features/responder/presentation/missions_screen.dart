import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/section_label.dart';
import '../../../core/widgets/states.dart';
import '../../incident/presentation/widgets/status_badges.dart';
import '../application/responder_providers.dart';
import '../domain/mission.dart';

class MissionsScreen extends ConsumerWidget {
  const MissionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final missions = ref.watch(myMissionsProvider);

    return ScreenScaffold(
      padded: false,
      child: missions.when(
        loading: () => LoadingView(label: l10n.commonLoading),
        error: (error, _) => ErrorView(
          message: describeError(l10n, error),
          retryLabel: l10n.commonRetry,
          onRetry: () => ref.invalidate(myMissionsProvider),
        ),
        data: (all) {
          final active = all.where((m) => !m.status.isPast).toList();
          final past = all.where((m) => m.status.isPast).toList();

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myMissionsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                if (all.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 64),
                    child: EmptyState(title: l10n.responderMissionsEmpty),
                  ),
                for (final mission in active) _MissionCard(mission: mission),
                if (past.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  SectionLabel(l10n.responderMissionsPastTitle.toUpperCase()),
                  const SizedBox(height: 8),
                  for (final mission in past) _MissionCard(mission: mission),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MissionCard extends StatelessWidget {
  const _MissionCard({required this.mission});

  final Mission mission;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        onTap: () => context.push('/responder/missions/${mission.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.responderMissionsIncident(mission.incidentId),
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: p.text),
                  ),
                ),
                MissionStatusBadge(status: mission.status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.directions_car_outlined, size: 14, color: p.textMuted),
                const SizedBox(width: 6),
                Text(mission.unitPlateNumber, style: TextStyle(fontSize: 13, color: p.textMuted)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
