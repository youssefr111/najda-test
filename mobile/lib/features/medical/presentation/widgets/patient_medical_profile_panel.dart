import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/app_card.dart';
import '../../application/medical_providers.dart';
import 'medical_profile_details.dart';

/// The patient's medical profile, for the people treating them. Access is
/// decided by the server; this just renders what it is willing to show.
class PatientMedicalProfilePanel extends ConsumerWidget {
  const PatientMedicalProfilePanel({required this.incidentId, super.key});

  final int incidentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final result = ref.watch(incidentMedicalProfileProvider(incidentId));

    // Not someone who may see it (e.g. a fire crew, or the incident closed):
    // show nothing at all rather than an error.
    final error = result.error;
    if (error is ApiException && error.status == 403) {
      return const SizedBox.shrink();
    }

    Widget message(String text, {Color? color}) => Text(
      text,
      style: TextStyle(fontSize: 14, height: 1.4, color: color ?? p.textMuted),
    );

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.monitor_heart_outlined, size: 20, color: p.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  l10n.patientMedicalProfileTitle,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.lock_outline, size: 13, color: p.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  l10n.patientMedicalProfileAuditNote,
                  style: TextStyle(fontSize: 12, color: p.textMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          result.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ),
            error: (_, _) =>
                message(l10n.patientMedicalProfileLoadError, color: p.danger),
            data: (data) {
              final profile = data.profile;
              if (!data.shared || profile == null) {
                return message(l10n.patientMedicalProfileNotShared);
              }
              if (profile.isEmpty) {
                return message(l10n.patientMedicalProfileSharedButEmpty);
              }
              return MedicalProfileDetails(profile: profile);
            },
          ),
        ],
      ),
    );
  }
}
