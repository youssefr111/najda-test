import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../domain/incident.dart';

/// Medical / Fire / Police as three tappable cards.
class IncidentTypeSelector extends StatelessWidget {
  const IncidentTypeSelector({
    required this.value,
    required this.onChanged,
    super.key,
  });

  final IncidentCategory? value;
  final ValueChanged<IncidentCategory> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    final options = [
      (
        IncidentCategory.medical,
        Icons.medical_services_outlined,
        l10n.citizenReportCategoryMedical,
      ),
      (
        IncidentCategory.fire,
        Icons.local_fire_department_outlined,
        l10n.citizenReportCategoryFire,
      ),
      (
        IncidentCategory.police,
        Icons.local_police_outlined,
        l10n.citizenReportCategoryPolice,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.only(start: 4),
          child: Text(
            l10n.citizenReportCategory,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: p.text,
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            for (var i = 0; i < options.length; i++) ...[
              if (i > 0) const SizedBox(width: 10),
              Expanded(
                child: _CategoryCard(
                  icon: options[i].$2,
                  label: options[i].$3,
                  selected: value == options[i].$1,
                  onTap: () => onChanged(options[i].$1),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final foreground = selected ? Colors.white : p.text;

    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: Material(
        color: selected ? p.primary : p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: selected ? p.primary : p.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
            child: Column(
              children: [
                Icon(
                  icon,
                  size: 30,
                  color: selected ? Colors.white : p.primary,
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: foreground,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
