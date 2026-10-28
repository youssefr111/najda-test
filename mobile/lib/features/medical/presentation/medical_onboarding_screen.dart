import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../application/medical_providers.dart';
import '../domain/medical_profile.dart';
import 'widgets/medical_profile_form.dart';

/// The optional "add your medical profile" step shown once, right after a
/// citizen registers. It never blocks anything: *Skip* is at the top (the form
/// is long, so the way out must not be hidden at the bottom) and *Save* is
/// pinned below, always reachable. The same form lives on the Account page.
class MedicalOnboardingScreen extends ConsumerStatefulWidget {
  const MedicalOnboardingScreen({super.key});

  @override
  ConsumerState<MedicalOnboardingScreen> createState() =>
      _MedicalOnboardingScreenState();
}

class _MedicalOnboardingScreenState
    extends ConsumerState<MedicalOnboardingScreen> {
  final _form = GlobalKey<MedicalProfileFormState>();

  @override
  void initState() {
    super.initState();
    // The form's state exists only after the first frame; rebuild once so the
    // pinned Save button can listen to its "saving" flag.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() {});
    });
  }

  void _finish() =>
      ref.read(medicalOnboardingPendingProvider.notifier).set(pending: false);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: ScreenScaffold(
              scroll: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: TextButton(
                      onPressed: _finish,
                      child: Text(
                        l10n.medicalProfileOnboardingSkip,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: p.primary.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.monitor_heart_outlined,
                        size: 32,
                        color: p.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: p.surfaceAlt,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        l10n.medicalProfileOnboardingOptional,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: p.textMuted,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    l10n.medicalProfileOnboardingTitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.medicalProfileOnboardingSubtitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.45,
                      color: p.textMuted,
                    ),
                  ),
                  const SizedBox(height: 28),
                  MedicalProfileForm(
                    key: _form,
                    profile: MedicalProfile.empty,
                    onSaved: _finish,
                    onCancel: _finish,
                    showActions: false,
                  ),
                ],
              ),
            ),
          ),
          // Pinned action bar: Save is reachable at any scroll position.
          Material(
            color: p.surface,
            elevation: 8,
            shadowColor: Colors.black26,
            child: SafeArea(
              top: false,
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: Breakpoints.contentMaxWidth,
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(context.pagePadding),
                    child: ValueListenableBuilder<bool>(
                      // Available from the second frame (see initState); idle until then.
                      valueListenable:
                          _form.currentState?.saving ?? ValueNotifier(false),
                      builder: (context, saving, _) => AppButton(
                        label: saving
                            ? l10n.medicalProfileSaving
                            : l10n.medicalProfileOnboardingSave,
                        loading: saving,
                        onPressed: () => _form.currentState?.save(),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
