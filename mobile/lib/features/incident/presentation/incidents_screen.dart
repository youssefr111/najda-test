import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/states.dart';
import '../application/incident_providers.dart';
import '../domain/incident.dart';
import 'widgets/status_badges.dart';

/// "My reports": the signed-in citizen's incident history.
class IncidentsScreen extends ConsumerWidget {
  const IncidentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final incidents = ref.watch(myIncidentsProvider);

    return ScreenScaffold(
      padded: false,
      child: incidents.when(
        loading: () => LoadingView(label: l10n.commonLoading),
        error: (error, _) => ErrorView(
          message: describeError(l10n, error),
          retryLabel: l10n.commonRetry,
          onRetry: () => ref.invalidate(myIncidentsProvider),
        ),
        data: (items) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(myIncidentsProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              BackHeader(title: l10n.accountMyReports, fallbackLocation: '/citizen/account'),
              if (items.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 48),
                  child: EmptyState(title: l10n.citizenIncidentsEmpty),
                )
              else
                for (final incident in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _IncidentCard(incident: incident),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IncidentCard extends StatelessWidget {
  const _IncidentCard({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();

    return AppCard(
      onTap: () => context.push('/citizen/account/incidents/${incident.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  categoryLabel(l10n, incident.category),
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: p.text),
                ),
              ),
              IncidentStatusBadge(status: incident.status),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.schedule, size: 14, color: p.textMuted),
              const SizedBox(width: 6),
              Text(
                DateFormat.yMMMd(locale).add_jm().format(incident.createdAt),
                style: TextStyle(fontSize: 13, color: p.textMuted),
              ),
            ],
          ),
          if (incident.aiPriority != null) ...[
            const SizedBox(height: 8),
            PriorityBadge(priority: incident.aiPriority!),
          ],
        ],
      ),
    );
  }
}
