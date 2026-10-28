import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../application/medical_providers.dart';
import '../domain/medical_profile.dart';
import 'widgets/medical_profile_details.dart';
import 'widgets/medical_profile_form.dart';

/// The Medical tab of the Account page: view, add, edit, review (stale) and
/// delete the user's medical profile.
class MedicalProfileCard extends ConsumerStatefulWidget {
  const MedicalProfileCard({super.key});

  @override
  ConsumerState<MedicalProfileCard> createState() => _MedicalProfileCardState();
}

class _MedicalProfileCardState extends ConsumerState<MedicalProfileCard> {
  bool _editing = false;

  void _stopEditing() => setState(() => _editing = false);

  void _saved() {
    _stopEditing();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(context.l10n.medicalProfileSavedToast)),
      );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final profile = ref.watch(medicalProfileProvider);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.medicalProfileTitle,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      l10n.medicalProfileDescription,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        color: p.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              if (profile.hasValue && !_editing)
                TextButton.icon(
                  onPressed: () => setState(() => _editing = true),
                  icon: const Icon(Icons.edit_outlined, size: 16),
                  label: Text(l10n.accountEditProfile),
                ),
            ],
          ),
          const SizedBox(height: 16),
          profile.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  l10n.medicalProfileLoadError,
                  style: TextStyle(fontSize: 14, color: p.danger),
                ),
                const SizedBox(height: 8),
                AppButton(
                  label: l10n.commonRetry,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => ref.invalidate(medicalProfileProvider),
                ),
              ],
            ),
            data: (data) => _editing
                ? MedicalProfileForm(
                    profile: data,
                    onSaved: _saved,
                    onCancel: _stopEditing,
                  )
                : _View(
                    profile: data,
                    onEdit: () => setState(() => _editing = true),
                  ),
          ),
        ],
      ),
    );
  }
}

class _View extends ConsumerWidget {
  const _View({required this.profile, required this.onEdit});

  final MedicalProfile profile;
  final VoidCallback onEdit;

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final confirmed = await confirmAction(
      context,
      title: l10n.medicalProfileDeleteConfirm,
      confirmLabel: l10n.medicalProfileDeleteConfirmAction,
      destructive: true,
    );
    if (!confirmed) return;

    try {
      await ref.read(medicalProfileProvider.notifier).delete();
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(describeError(l10n, error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();

    if (profile.isEmpty) {
      return Column(
        children: [
          Icon(Icons.monitor_heart_outlined, size: 44, color: p.textSubtle),
          const SizedBox(height: 12),
          Text(
            l10n.medicalProfileEmptyState,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, height: 1.45, color: p.textMuted),
          ),
          const SizedBox(height: 16),
          AppButton(label: l10n.medicalProfileAdd, onPressed: onEdit),
        ],
      );
    }

    final months = profile.monthsSinceUpdate(DateTime.now()) ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (profile.isStale(DateTime.now())) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: p.warning.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: p.warning.withValues(alpha: 0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.schedule, size: 18, color: p.warning),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        l10n.medicalProfileStaleNotice(months),
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          color: p.text,
                        ),
                      ),
                    ),
                  ],
                ),
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: TextButton(
                    onPressed: onEdit,
                    child: Text(l10n.medicalProfileReview),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        MedicalProfileDetails(profile: profile),
        const SizedBox(height: 18),
        Divider(color: p.border, height: 1),
        const SizedBox(height: 12),
        Row(
          children: [
            Icon(
              profile.shareWithResponders
                  ? Icons.verified_user_outlined
                  : Icons.shield_outlined,
              size: 16,
              color: profile.shareWithResponders ? p.success : p.textMuted,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                profile.shareWithResponders
                    ? l10n.medicalProfileSharingStatusOn
                    : l10n.medicalProfileSharingStatusOff,
                style: TextStyle(fontSize: 12, color: p.textMuted),
              ),
            ),
          ],
        ),
        if (profile.updatedAt != null) ...[
          const SizedBox(height: 4),
          Text(
            l10n.medicalProfileLastUpdated(
              DateFormat.yMMMd(locale).format(profile.updatedAt!),
            ),
            style: TextStyle(fontSize: 12, color: p.textMuted),
          ),
        ],
        const SizedBox(height: 8),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton(
            onPressed: () => _delete(context, ref),
            style: TextButton.styleFrom(
              foregroundColor: p.textMuted,
              padding: EdgeInsets.zero,
            ),
            child: Text(
              l10n.medicalProfileDeleteAction,
              style: const TextStyle(fontSize: 12),
            ),
          ),
        ),
      ],
    );
  }
}
