import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/l10n/l10n_x.dart';
import '../core/theme/app_palette.dart';
import '../core/widgets/app_button.dart';
import '../core/widgets/app_logo.dart';
import '../features/auth/application/auth_controller.dart';
import '../features/legal/application/legal_providers.dart';
import '../features/legal/data/legal_repository.dart';
import '../features/legal/domain/legal.dart';
import '../features/legal/presentation/legal_document_body.dart';

/// Puts the [_ConsentScreen] over the whole app while the signed-in person has not accepted the
/// latest Terms and Privacy Policy. The app underneath keeps its state, so accepting returns
/// exactly where the person was. Re-checks whenever the app returns to the foreground.
class LegalConsentGate extends ConsumerStatefulWidget {
  const LegalConsentGate({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<LegalConsentGate> createState() => _LegalConsentGateState();
}

class _LegalConsentGateState extends ConsumerState<LegalConsentGate>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(consentStatusProvider);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pending = ref
        .watch(consentStatusProvider)
        .when(
          data: (value) => value,
          loading: () => const <PendingConsent>[],
          error: (_, _) => const <PendingConsent>[],
        );

    return Stack(
      children: [
        Positioned.fill(child: widget.child),
        if (pending.isNotEmpty)
          Positioned.fill(child: _ConsentScreen(pending: pending)),
      ],
    );
  }
}

class _ConsentScreen extends ConsumerStatefulWidget {
  const _ConsentScreen({required this.pending});

  final List<PendingConsent> pending;

  @override
  ConsumerState<_ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends ConsumerState<_ConsentScreen> {
  bool _agreed = false;
  bool _saving = false;
  bool _failed = false;

  Future<void> _accept() async {
    setState(() {
      _saving = true;
      _failed = false;
    });
    try {
      await ref
          .read(legalRepositoryProvider)
          .accept([for (final item in widget.pending) item.versionId]);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    } finally {
      // Success clears the prompt; a 409 (a newer version came out) shows what is pending now.
      ref.invalidate(consentStatusProvider);
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final language = Localizations.localeOf(context).languageCode;

    return Material(
      color: p.background,
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(child: AppLogo(size: 72)),
                  const SizedBox(height: 16),
                  Text(
                    l10n.legalGateTitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n.legalGateBody,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, height: 1.4, color: p.textMuted),
                  ),
                  const SizedBox(height: 20),
                  for (final item in widget.pending)
                    _PendingCard(item: item, language: language),
                  CheckboxListTile(
                    value: _agreed,
                    onChanged: _saving ? null : (v) => setState(() => _agreed = v ?? false),
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      l10n.legalGateAgree,
                      style: TextStyle(fontSize: 14, color: p.text),
                    ),
                  ),
                  if (_failed)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        l10n.legalGateError,
                        style: TextStyle(fontSize: 13, color: p.danger),
                      ),
                    ),
                  AppButton(
                    label: l10n.legalGateAccept,
                    loading: _saving,
                    onPressed: _agreed ? _accept : null,
                  ),
                  const SizedBox(height: 8),
                  AppButton(
                    label: l10n.accountLogout,
                    variant: AppButtonVariant.ghost,
                    onPressed: _saving
                        ? null
                        : () => ref.read(authControllerProvider.notifier).signOut(),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    l10n.lockEmergencyHint,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: p.textMuted),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final (label, number) in [
                        (l10n.reportHotlinePolice, '122'),
                        (l10n.reportHotlineAmbulance, '123'),
                        (l10n.reportHotlineFire, '180'),
                      ])
                        ActionChip(
                          avatar: const Icon(Icons.call, size: 16),
                          label: Text(label),
                          onPressed: () => unawaited(
                            launchUrl(Uri(scheme: 'tel', path: number)),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// One document to accept: what changed, and the full text one tap away (read inline: this
/// prompt sits above the app's navigator, so it can't open another screen).
class _PendingCard extends ConsumerWidget {
  const _PendingCard({required this.item, required this.language});

  final PendingConsent item;
  final String language;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final summary = item.changeSummary?.resolve(language);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: p.surfaceAlt,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.border),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 12),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          title: Text(
            item.title.resolve(language),
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: p.text),
          ),
          subtitle: Text(
            [
              l10n.legalGateVersion(item.version),
              if (summary != null) '${l10n.legalGateWhatChanged}: $summary',
            ].join('\n'),
            style: TextStyle(fontSize: 12, height: 1.4, color: p.textMuted),
          ),
          children: [
            ref
                .watch(legalDocumentProvider(item.type))
                .when(
                  loading: () => const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (_, _) => Text(l10n.legalUnavailable),
                  data: (document) => document == null
                      ? Text(l10n.legalUnavailable)
                      : LegalDocumentBody(
                          content: document.content,
                          language: language,
                        ),
                ),
          ],
        ),
      ),
    );
  }
}
