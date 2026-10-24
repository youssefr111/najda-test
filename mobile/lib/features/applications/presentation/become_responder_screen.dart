import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/storage/preferences.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/section_label.dart';
import '../../../core/widgets/states.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/domain/role.dart';
import '../../kyc/application/kyc_providers.dart';
import '../../kyc/presentation/verify_account_card.dart';
import '../application/application_providers.dart';
import '../data/responder_application_repository.dart';
import '../domain/document_rules.dart';
import '../domain/responder_application.dart';

class BecomeResponderScreen extends ConsumerStatefulWidget {
  const BecomeResponderScreen({super.key});

  @override
  ConsumerState<BecomeResponderScreen> createState() =>
      _BecomeResponderScreenState();
}

class _BecomeResponderScreenState extends ConsumerState<BecomeResponderScreen> {
  final _motivation = TextEditingController();
  final List<PickedDocument> _documents = [];

  bool _submitting = false;
  String? _error;
  String? _fileError;

  /// Scoped to the signed-in user so another account on this phone never sees it.
  String? get _draftKey {
    final id = ref.read(currentUserProvider)?.id;
    return id == null ? null : '${PrefKeys.responderApplicationDraft}-$id';
  }

  @override
  void initState() {
    super.initState();
    // Bring back what was typed before the screen was left or the app closed.
    final key = _draftKey;
    if (key != null) {
      _motivation.text =
          ref.read(sharedPreferencesProvider).getString(key) ?? '';
    }
  }

  void _saveDraft(String text) {
    final key = _draftKey;
    if (key == null) return;
    final prefs = ref.read(sharedPreferencesProvider);
    text.trim().isEmpty ? prefs.remove(key) : prefs.setString(key, text);
  }

  @override
  void dispose() {
    _motivation.dispose();
    super.dispose();
  }

  static Future<int> _sizeOf(String path) async {
    try {
      return await File(path).length();
    } on FileSystemException {
      return 0; // unreadable: the server still validates the upload
    }
  }

  Future<void> _pickFiles() async {
    final l10n = context.l10n;
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: applicationDocumentExtensions,
    );
    if (files.isEmpty) return;

    // The size is read from the file itself rather than from the picker result,
    // so this does not depend on which file_picker version is installed.
    final incoming = <PickedDocument>[];
    for (final file in files) {
      final path = file.path;
      if (path == null) continue;
      incoming.add(
        PickedDocument(
          path: path,
          name: file.name,
          sizeBytes: await _sizeOf(path),
        ),
      );
    }
    if (!mounted) return;
    final check = checkDocuments(_documents, incoming);

    setState(() {
      _documents.addAll(check.accepted);
      final problem = check.problem;
      _fileError = problem == null
          ? null
          : switch (problem.reason) {
              DocumentProblemReason.type =>
                l10n.becomeResponderPageFileTypeError(problem.fileName),
              DocumentProblemReason.size =>
                l10n.becomeResponderPageFileSizeError(
                  problem.fileName,
                  maxDocumentMb,
                ),
              DocumentProblemReason.total =>
                l10n.becomeResponderPageTotalSizeError(maxTotalDocumentsMb),
            };
    });
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    if (_documents.isEmpty) {
      setState(() => _error = l10n.becomeResponderPageDocumentRequired);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref
          .read(responderApplicationRepositoryProvider)
          .submit(motivation: _motivation.text.trim(), documents: _documents);
      ref.invalidate(myApplicationsProvider);
      final key = _draftKey;
      if (key != null) await ref.read(sharedPreferencesProvider).remove(key);
      if (mounted) {
        _motivation.clear();
        setState(_documents.clear);
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error =
              '${l10n.becomeResponderPageSubmitError} ${describeError(l10n, error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final user = ref.watch(currentUserProvider);
    final applications = ref.watch(myApplicationsProvider);
    final locale = Localizations.localeOf(context).toString();

    if (user == null) return LoadingView(label: l10n.commonLoading);

    Widget page(List<Widget> children) => ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackHeader(
            title: l10n.becomeResponderPageTitle,
            fallbackLocation: '/citizen/account',
          ),
          ...children,
        ],
      ),
    );

    if (user.role != Role.citizen) {
      return page([
        Text(
          l10n.becomeResponderPageCitizenOnly,
          style: TextStyle(color: p.textMuted),
        ),
      ]);
    }

    // Applying needs all three: a verified email, phone number and identity.
    final identity = ref.watch(kycStateProvider);
    final contactVerified = user.emailVerified && user.phoneVerified;
    if (contactVerified && identity.value == null) {
      return identity.hasError
          ? ErrorView(
              message: describeError(l10n, identity.error!),
              retryLabel: l10n.commonRetry,
              onRetry: () => ref.invalidate(kycStateProvider),
            )
          : LoadingView(label: l10n.commonLoading);
    }
    final identityVerified = identity.value?.verified ?? false;
    if (!(contactVerified && identityVerified)) {
      return page([
        VerifyAccountCard(
          body: l10n.becomeResponderPageVerifyFirstBody,
          requirements: [
            VerificationRequirement(label: l10n.becomeResponderPageEmailStep, done: user.emailVerified),
            VerificationRequirement(label: l10n.becomeResponderPagePhoneStep, done: user.phoneVerified),
            VerificationRequirement(label: l10n.becomeResponderPageIdentityStep, done: identityVerified),
          ],
          onGoToAccount: () => context.go('/citizen/account'),
        ),
      ]);
    }

    return applications.when(
      loading: () => LoadingView(label: l10n.commonLoading),
      error: (error, _) => ErrorView(
        message: describeError(l10n, error),
        retryLabel: l10n.commonRetry,
        onRetry: () => ref.invalidate(myApplicationsProvider),
      ),
      data: (all) {
        final pending = all
            .where((a) => a.status == ApplicationStatus.pending)
            .firstOrNull;
        if (pending != null) {
          return page([
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.becomeResponderPagePendingTitle,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.becomeResponderPagePendingBody(
                      DateFormat.yMMMd(locale).format(pending.submittedAt),
                    ),
                    style: TextStyle(fontSize: 14, color: p.textMuted),
                  ),
                ],
              ),
            ),
          ]);
        }

        final previous =
            all.where((a) => a.status != ApplicationStatus.pending).toList()
              ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));

        return page([
          Text(
            l10n.becomeResponderPageSubtitle,
            style: TextStyle(fontSize: 14, color: p.textMuted),
          ),
          if (previous.isNotEmpty) ...[
            const SizedBox(height: 16),
            _PreviousApplications(applications: previous),
          ],
          const SizedBox(height: 16),
          AppTextField(
            controller: _motivation,
            onChanged: (value) {
              _saveDraft(value);
              setState(() {});
            },
            hintText: l10n.becomeResponderPageMotivationPlaceholder,
            minLines: 3,
            maxLines: 6,
            maxLength: 1000,
            textCapitalization: TextCapitalization.sentences,
          ),
          const SizedBox(height: 16),
          SectionLabel(l10n.becomeResponderPageDocumentsLabel),
          const SizedBox(height: 8),
          for (final document in _documents)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Container(
                padding: const EdgeInsetsDirectional.only(start: 12),
                decoration: BoxDecoration(
                  color: p.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: p.border),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.description_outlined,
                      size: 18,
                      color: p.textMuted,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        document.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 14, color: p.text),
                      ),
                    ),
                    IconButton(
                      tooltip: l10n.becomeResponderPageRemoveFile,
                      onPressed: _submitting
                          ? null
                          : () => setState(() => _documents.remove(document)),
                      icon: Icon(Icons.close, size: 18, color: p.danger),
                    ),
                  ],
                ),
              ),
            ),
          AppButton(
            label: l10n.becomeResponderPagePickFiles,
            variant: AppButtonVariant.secondary,
            onPressed: _submitting ? null : _pickFiles,
          ),
          if (_fileError != null) ...[
            const SizedBox(height: 8),
            Text(_fileError!, style: TextStyle(fontSize: 12, color: p.danger)),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 16),
          AppButton(
            label: _submitting
                ? l10n.becomeResponderPageSubmitting
                : l10n.becomeResponderPageSubmit,
            loading: _submitting,
            onPressed: (_motivation.text.trim().isEmpty || _documents.isEmpty)
                ? null
                : _submit,
          ),
          if (_documents.isEmpty) ...[
            const SizedBox(height: 8),
            Text(
              l10n.becomeResponderPageDocumentRequired,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: p.warning),
            ),
          ],
        ]);
      },
    );
  }
}

/// Earlier applications, with the reviewer's reason, so a rejection is never unexplained.
class _PreviousApplications extends StatelessWidget {
  const _PreviousApplications({required this.applications});

  final List<ResponderApplication> applications;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();
    final date = DateFormat.yMMMd(locale);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.becomeResponderPagePreviousTitle,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            l10n.becomeResponderPagePreviousHint,
            style: TextStyle(fontSize: 12, color: p.textMuted),
          ),
          for (final application in applications) ...[
            Divider(height: 24, color: p.border),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color:
                        (application.status == ApplicationStatus.approved
                                ? p.success
                                : p.danger)
                            .withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    application.status == ApplicationStatus.approved
                        ? l10n.becomeResponderPageStatusApproved
                        : l10n.becomeResponderPageStatusRejected,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: application.status == ApplicationStatus.approved
                          ? p.success
                          : p.danger,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    l10n.becomeResponderPageSubmittedOn(
                      date.format(application.submittedAt),
                    ),
                    style: TextStyle(fontSize: 12, color: p.textMuted),
                  ),
                ),
              ],
            ),
            if (application.status == ApplicationStatus.rejected) ...[
              const SizedBox(height: 8),
              Text.rich(
                TextSpan(
                  style: TextStyle(fontSize: 14, height: 1.4, color: p.text),
                  children: [
                    TextSpan(
                      text: '${l10n.becomeResponderPageReasonLabel} ',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    (application.reviewNotes ?? '').trim().isEmpty
                        ? TextSpan(
                            text: l10n.becomeResponderPageNoReasonGiven,
                            style: TextStyle(
                              fontStyle: FontStyle.italic,
                              color: p.textMuted,
                            ),
                          )
                        : TextSpan(text: application.reviewNotes!.trim()),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
