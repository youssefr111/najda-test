import 'package:flutter/material.dart';

import '../../../../core/l10n/enum_labels.dart';
import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/widgets/app_badge.dart';
import '../../../responder/domain/mission.dart';
import '../../domain/incident.dart';

class IncidentStatusBadge extends StatelessWidget {
  const IncidentStatusBadge({required this.status, super.key});

  final IncidentStatus status;

  @override
  Widget build(BuildContext context) {
    final tone = switch (status) {
      IncidentStatus.created ||
      IncidentStatus.aiProcessed ||
      IncidentStatus.dispatcherReview =>
        BadgeTone.info,
      IncidentStatus.assigned || IncidentStatus.inProgress => BadgeTone.warning,
      IncidentStatus.resolved => BadgeTone.success,
      IncidentStatus.cancelled => BadgeTone.neutral,
    };
    return AppBadge(label: incidentStatusLabel(context.l10n, status), tone: tone);
  }
}

class MissionStatusBadge extends StatelessWidget {
  const MissionStatusBadge({required this.status, super.key});

  final MissionStatus status;

  @override
  Widget build(BuildContext context) {
    final tone = switch (status) {
      MissionStatus.offered => BadgeTone.info,
      MissionStatus.accepted || MissionStatus.enRoute || MissionStatus.arrived => BadgeTone.warning,
      MissionStatus.completed => BadgeTone.success,
      MissionStatus.rejected || MissionStatus.cancelled => BadgeTone.neutral,
    };
    return AppBadge(label: missionStatusLabel(context.l10n, status), tone: tone);
  }
}

class PriorityBadge extends StatelessWidget {
  const PriorityBadge({required this.priority, super.key});

  final AiPriority priority;

  @override
  Widget build(BuildContext context) {
    final tone = switch (priority) {
      AiPriority.critical => BadgeTone.danger,
      AiPriority.high => BadgeTone.warning,
      AiPriority.medium => BadgeTone.info,
      AiPriority.low => BadgeTone.neutral,
    };
    return AppBadge(label: aiPriorityLabel(context.l10n, priority), tone: tone);
  }
}
