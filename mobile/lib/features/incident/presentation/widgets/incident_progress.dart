import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/geo/geo_utils.dart';
import '../../../../core/l10n/enum_labels.dart';
import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../responder/domain/mission.dart';
import '../../../responder/domain/unit.dart';
import '../../domain/incident.dart';
import '../../domain/incident_responder.dart';
import '../../domain/responder_eta.dart';
import 'responder_tracking_map.dart';

/// Where the citizen's report is in its journey, derived from the incident and
/// the units working it.
enum ProgressStep { received, assigned, onTheWay, arrived, completed }

ProgressStep progressOf(Incident incident, List<IncidentResponder> responders) {
  if (incident.status == IncidentStatus.resolved) return ProgressStep.completed;
  if (responders.any(
    (r) =>
        r.status == MissionStatus.arrived ||
        r.status == MissionStatus.completed,
  )) {
    return ProgressStep.arrived;
  }
  if (responders.any((r) => r.status == MissionStatus.enRoute)) {
    return ProgressStep.onTheWay;
  }
  if (responders.isNotEmpty ||
      incident.status == IncidentStatus.assigned ||
      incident.status == IncidentStatus.inProgress) {
    return ProgressStep.assigned;
  }
  return ProgressStep.received;
}

/// The big status card at the top: what is happening right now, plus the
/// five-step timeline.
class IncidentProgressCard extends StatelessWidget {
  const IncidentProgressCard({
    required this.incident,
    required this.responders,
    super.key,
  });

  final Incident incident;
  final List<IncidentResponder> responders;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();
    final step = progressOf(incident, responders);

    final labels = {
      ProgressStep.received: l10n.statusPending,
      ProgressStep.assigned: l10n.statusAssigned,
      ProgressStep.onTheWay: l10n.statusEnRoute,
      ProgressStep.arrived: l10n.statusOnScene,
      ProgressStep.completed: l10n.statusCompleted,
    };
    final icons = {
      ProgressStep.received: Icons.mark_email_read_outlined,
      ProgressStep.assigned: Icons.person_pin_circle_outlined,
      ProgressStep.onTheWay: Icons.directions_car_outlined,
      ProgressStep.arrived: Icons.flag_outlined,
      ProgressStep.completed: Icons.check_circle_outline,
    };

    final done = step == ProgressStep.completed;
    final accent = done ? p.success : p.primary;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icons[step], color: accent, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      labels[step]!,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${categoryLabel(l10n, incident.category)} · ${DateFormat.jm(locale).format(incident.createdAt)}',
                      style: TextStyle(fontSize: 13, color: p.textMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          for (final s in ProgressStep.values)
            _TimelineRow(
              label: labels[s]!,
              state: s.index < step.index
                  ? _RowState.done
                  : (s == step
                        ? (done ? _RowState.done : _RowState.current)
                        : _RowState.pending),
              last: s == ProgressStep.values.last,
            ),
        ],
      ),
    );
  }
}

enum _RowState { done, current, pending }

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.label,
    required this.state,
    required this.last,
  });

  final String label;
  final _RowState state;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final active = state != _RowState.pending;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: state == _RowState.done
                        ? p.primary
                        : (state == _RowState.current
                              ? p.surface
                              : p.surfaceAlt),
                    border: Border.all(
                      color: active ? p.primary : p.border,
                      width: state == _RowState.current ? 3 : 1.5,
                    ),
                  ),
                  child: state == _RowState.done
                      ? const Icon(Icons.check, size: 14, color: Colors.white)
                      : null,
                ),
                if (!last)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: state == _RowState.done ? p.primary : p.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: last ? 0 : 14),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: state == _RowState.current
                      ? FontWeight.w800
                      : FontWeight.w500,
                  color: active ? p.text : p.textMuted,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The units working the incident, each with its stage and -- once a position is
/// known -- an approximate distance and arrival time.
class ResponderUnitsSection extends StatelessWidget {
  const ResponderUnitsSection({
    required this.incident,
    required this.responders,
    super.key,
  });

  final Incident incident;
  final List<IncidentResponder> responders;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.unitsTitle,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 12),
          if (responders.isEmpty)
            Text(
              l10n.noUnitsYet,
              style: TextStyle(fontSize: 14, color: p.textMuted),
            )
          else ...[
            for (var i = 0; i < responders.length; i++) ...[
              if (i > 0) Divider(height: 20, color: p.border),
              _UnitTile(incident: incident, responder: responders[i]),
            ],
            const SizedBox(height: 12),
            Text(
              l10n.etaApproxNote,
              style: TextStyle(fontSize: 12, color: p.textSubtle),
            ),
          ],
        ],
      ),
    );
  }
}

class _UnitTile extends StatelessWidget {
  const _UnitTile({required this.incident, required this.responder});

  final Incident incident;
  final IncidentResponder responder;

  static IconData _icon(UnitType type) => switch (type) {
    UnitType.ambulance => Icons.medical_services_outlined,
    UnitType.fireTruck => Icons.local_fire_department_outlined,
    UnitType.policeCar => Icons.local_police_outlined,
    UnitType.firstResponder => Icons.health_and_safety_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final color = Color(
      int.parse(
        'FF${ResponderTrackingMapColors.of(responder.unitType).substring(1)}',
        radix: 16,
      ),
    );

    String? distanceText;
    String? etaText;
    if (responder.hasPosition) {
      final meters = distanceMeters(
        responder.latitude!,
        responder.longitude!,
        incident.latitude,
        incident.longitude,
      );
      distanceText = meters < 1000
          ? '${meters.round()} ${l10n.metersShort}'
          : '${(meters / 1000).toStringAsFixed(1)} ${l10n.kmShort}';
      final travelling =
          responder.status == MissionStatus.enRoute ||
          responder.status == MissionStatus.accepted;
      if (travelling) {
        etaText =
            '≈ ${estimatedArrivalMinutes(responder.unitType, meters)} ${l10n.minutesShort}';
      }
    }

    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(_icon(responder.unitType), color: color, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                unitTypeLabel(l10n, responder.unitType),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              Text(
                responderProgressLabel(l10n, responder.status) +
                    (responder.hasPosition
                        ? ''
                        : ' · ${l10n.responderTrackingLocationUnavailable}'),
                style: TextStyle(fontSize: 13, color: p.textMuted),
              ),
            ],
          ),
        ),
        if (distanceText != null)
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (etaText != null)
                Text(
                  etaText,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: p.primary,
                  ),
                ),
              Text(
                distanceText,
                style: TextStyle(fontSize: 12, color: p.textMuted),
              ),
            ],
          ),
      ],
    );
  }
}
