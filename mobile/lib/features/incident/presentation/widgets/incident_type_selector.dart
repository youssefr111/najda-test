import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_palette.dart';
import '../../domain/incident.dart';

class IncidentTypeSelector extends StatelessWidget {
  const IncidentTypeSelector({required this.value, required this.onChanged, super.key});

  final IncidentCategory? value;
  final ValueChanged<IncidentCategory> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final options = [
      (IncidentCategory.medical, Icons.medical_services, l10n.citizenReportCategoryMedical),
      (IncidentCategory.fire, Icons.local_fire_department, l10n.citizenReportCategoryFire),
      (IncidentCategory.police, Icons.shield, l10n.citizenReportCategoryPolice),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.citizenReportCategory.toUpperCase(),
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: p.textMuted),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            for (var i = 0; i < options.length; i++) ...[
              if (i > 0) const SizedBox(width: 12),
              Expanded(
                child: Builder(
                  builder: (context) {
                    final (category, icon, label) = options[i];
                    final selected = value == category;
                    return InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => onChanged(category),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        decoration: BoxDecoration(
                          color: selected
                              ? AppColors.emergencyAccent
                              : (isDark ? p.surfaceAlt : p.surface),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: selected ? AppColors.emergency : p.border,
                            width: 2,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(icon, size: 32, color: selected ? Colors.white : AppColors.emergency),
                            const SizedBox(height: 8),
                            Text(
                              label,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: selected ? Colors.white : p.text,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
