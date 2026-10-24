import '../../../core/router/route_paths.dart';
import '../../../core/widgets/segmented_choice.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/request_id.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/states.dart';
import '../application/active_incident_provider.dart';
import '../application/incident_providers.dart';
import '../application/location_config_provider.dart';
import '../application/outbox_controller.dart';
import '../application/report_draft_controller.dart';
import '../domain/incident.dart';
import '../domain/incident_location_config.dart';
import '../../medical/presentation/widgets/medical_sharing_toggle.dart';
import '../domain/report_position.dart';
import 'evidence/evidence_capture_bar.dart';
import 'evidence/pending_attachment_list.dart';
import 'widgets/incident_type_selector.dart';
import 'widgets/injured_counter.dart';
import 'widgets/report_location_card.dart';

enum _Stage { form, sent, queued }

/// The citizen's emergency report form.
///
/// Everything typed or attached is saved as it happens, so leaving the screen,
/// a crash or a lost connection never costs the person their report. Sending
/// goes through the outbox: it is stored on the phone first and then delivered
/// as soon as there is a connection.
class ReportScreen extends ConsumerStatefulWidget {
  const ReportScreen({super.key, this.initialCategory});

  /// Chosen on the home screen (quick-report buttons / SOS). `null` keeps the
  /// category of the restored draft.
  final IncidentCategory? initialCategory;

  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  final _description = TextEditingController();

  bool _hydrated = false;
  bool _showRestoredNotice = false;
  ReportPosition? _position;
  bool _submitting = false;
  String? _error;

  _Stage _stage = _Stage.form;
  int? _sentIncidentId;
  int _failedUploads = 0;

  @override
  void initState() {
    super.initState();

    // Fill the form from the saved draft as soon as it has been read.
    ref.listenManual(reportDraftControllerProvider, (_, next) {
      if (_hydrated || !next.loaded) return;
      _hydrated = true;
      _description.text = next.draft.description;
      final requested = widget.initialCategory;
      if (requested != null && requested != next.draft.category) {
        Future.microtask(
          () => ref
              .read(reportDraftControllerProvider.notifier)
              .setCategory(requested),
        );
      }
      if (next.restored) setState(() => _showRestoredNotice = true);
    }, fireImmediately: true);

    WidgetsBinding.instance.addPostFrameCallback((_) => _guard());
  }

  /// One active report at a time: if one exists (or is waiting to be sent),
  /// this screen has nothing to do.
  void _guard() {
    if (!mounted) return;
    final l10n = context.l10n;

    final outbox = ref.read(outboxControllerProvider);
    if (outbox.hasReport) {
      final reason = outbox.phase == OutboxPhase.rejected ? outbox.error : null;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(reason ?? l10n.pendingAlready)));
      context.pop();
      return;
    }
    final active = ref.read(activeIncidentProvider);
    if (active != null) context.go('${areaOf(context)}/incident/${active.id}');
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    final position = _position;
    if (position == null) {
      setState(() => _error = l10n.citizenReportLocationRequired);
      return;
    }

    final config =
        ref.read(incidentLocationConfigProvider).value ??
        IncidentLocationConfig.unknown;
    if (!config.contains(position.latitude, position.longitude)) {
      setState(() => _error = l10n.reportLocationOutsideEgypt);
      return;
    }

    setState(() {
      _error = null;
      _submitting = true;
    });

    final drafts = ref.read(reportDraftControllerProvider.notifier);
    final draft = ref.read(reportDraftControllerProvider).draft;
    final text = _description.text.trim();

    final result = await ref
        .read(outboxControllerProvider.notifier)
        .submit(
          request: SubmitIncidentRequest(
            category: draft.category,
            textMessage: text.isEmpty ? null : text,
            latitude: position.latitude,
            longitude: position.longitude,
            locationSource: position.source,
            injuredCount: draft.injuredCount,
            // Someone else's emergency never carries the reporter's medical profile.
            shareMedicalProfile:
                draft.reportedFor == ReportedFor.self &&
                draft.shareMedicalProfile,
            reportedFor: draft.reportedFor,
            deviceLatitude: position.deviceLatitude,
            deviceLongitude: position.deviceLongitude,
            clientRequestId: generateRequestId(),
          ),
          attachments: draft.attachments,
        );

    // Sent or safely queued: the draft has done its job. (Done before the
    // mounted check so it happens even if the person already left the screen.)
    if (result is! OutboxRejected) {
      await drafts.clear();
      ref.invalidate(myIncidentsProvider);
    }
    if (!mounted) return;

    setState(() {
      _submitting = false;
      switch (result) {
        case OutboxSent(:final incidentId, :final failedUploads):
          _sentIncidentId = incidentId;
          _failedUploads = failedUploads;
          _stage = _Stage.sent;
        case OutboxQueued():
          _stage = _Stage.queued;
        case OutboxRejected(:final message):
          _error = message;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    switch (_stage) {
      case _Stage.sent:
        return _SentView(
          incidentId: _sentIncidentId!,
          failedUploads: _failedUploads,
        );
      case _Stage.queued:
        return const _QueuedView();
      case _Stage.form:
        break;
    }

    final l10n = context.l10n;
    final p = context.palette;
    final draftState = ref.watch(reportDraftControllerProvider);
    if (!draftState.loaded) return LoadingView(label: l10n.commonLoading);

    final draft = draftState.draft;
    final drafts = ref.read(reportDraftControllerProvider.notifier);
    final canSubmit = _position != null && !_submitting;

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackHeader(
            title: l10n.reportTitle,
            fallbackLocation: areaOf(context),
          ),
          if (_showRestoredNotice) ...[
            _InfoBanner(
              icon: Icons.history_rounded,
              text: l10n.reportDraftRestored,
              onDismiss: () => setState(() => _showRestoredNotice = false),
            ),
            const SizedBox(height: 16),
          ],
          IncidentTypeSelector(
            value: draft.category,
            onChanged: drafts.setCategory,
          ),
          const SizedBox(height: 20),
          // The first question: who is this for? Explicit (not a buried toggle) so a bystander's report is
          // never mistaken for the reporter's own emergency, and the reporter's medical profile -- which
          // describes THEM -- is never shown for someone else's.
          Text(
            l10n.reportWhoTitle,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: p.text,
            ),
          ),
          const SizedBox(height: 8),
          SegmentedChoice<ReportedFor>(
            options: ReportedFor.values,
            value: draft.reportedFor,
            labelOf: (v) =>
                v == ReportedFor.self ? l10n.reportWhoMe : l10n.reportWhoOther,
            onChanged: (v) => drafts.update((d) => d.copyWith(reportedFor: v)),
          ),
          if (draft.reportedFor == ReportedFor.other)
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: p.warning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                l10n.reportWhoOtherHint,
                style: TextStyle(fontSize: 13, height: 1.4, color: p.text),
              ),
            ),
          const SizedBox(height: 20),
          AppTextField(
            label: l10n.citizenReportDescription,
            controller: _description,
            hintText: l10n.citizenReportDescriptionPlaceholder,
            minLines: 3,
            maxLines: 6,
            maxLength: 1000,
            textCapitalization: TextCapitalization.sentences,
            onChanged: (value) =>
                drafts.update((d) => d.copyWith(description: value)),
          ),
          const SizedBox(height: 16),
          InjuredCounter(
            value: draft.injuredCount,
            onChanged: (count) =>
                drafts.update((d) => d.copyWith(injuredCount: count)),
          ),
          // Only appears for people who allowed sharing; lets them withhold the
          // profile for this report (e.g. when calling for someone else).
          if (draft.reportedFor == ReportedFor.self)
            MedicalSharingToggle(
              value: draft.shareMedicalProfile,
              onChanged: (value) =>
                  drafts.update((d) => d.copyWith(shareMedicalProfile: value)),
            ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 4),
            child: Text(
              l10n.mediaAttachmentTitle,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ),
          const SizedBox(height: 10),
          EvidenceCaptureBar(
            enabled: !_submitting,
            onCaptured: (attachment) => unawaited(
              drafts.addAttachment(
                kind: attachment.kind,
                sourcePath: attachment.path,
                duration: attachment.duration,
              ),
            ),
          ),
          if (draft.attachments.isNotEmpty) ...[
            const SizedBox(height: 12),
            PendingAttachmentList(
              items: draft.attachments,
              onRemove: (a) => unawaited(drafts.removeAttachment(a.id)),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.reportAttachmentsHint,
              style: TextStyle(fontSize: 12, color: p.textMuted),
            ),
          ],
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 4),
            child: Text(
              l10n.reportLocationTitle,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ),
          const SizedBox(height: 10),
          ReportLocationCard(
            onChanged: (position) => setState(() => _position = position),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.danger,
              ),
            ),
          ],
          const SizedBox(height: 20),
          AppButton(
            label: _submitting
                ? l10n.citizenReportSubmitting
                : l10n.citizenReportSubmitAlert,
            icon: Icons.campaign_rounded,
            loading: _submitting,
            onPressed: canSubmit ? _submit : null,
          ),
          if (_position == null && !_submitting) ...[
            const SizedBox(height: 8),
            Text(
              l10n.citizenReportLocationRequired,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: p.textMuted),
            ),
          ],
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({
    required this.icon,
    required this.text,
    required this.onDismiss,
  });

  final IconData icon;
  final String text;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsetsDirectional.fromSTEB(14, 6, 6, 6),
      decoration: BoxDecoration(
        color: p.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: p.primary.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: p.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: TextStyle(fontSize: 13, color: p.text)),
          ),
          IconButton(
            onPressed: onDismiss,
            icon: Icon(Icons.close, size: 18, color: p.textMuted),
            tooltip: context.l10n.mediaGalleryClose,
          ),
        ],
      ),
    );
  }
}

/// The server has the report.
class _SentView extends StatelessWidget {
  const _SentView({required this.incidentId, required this.failedUploads});

  final int incidentId;
  final int failedUploads;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return ScreenScaffold(
      scroll: true,
      centered: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.check_circle_rounded, size: 72, color: p.success),
          const SizedBox(height: 16),
          Text(
            l10n.citizenReportAlertSent,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.citizenReportSubmittedToDispatch(incidentId),
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, height: 1.4, color: p.textMuted),
          ),
          if (failedUploads > 0) ...[
            const SizedBox(height: 12),
            Text(
              l10n.mediaGalleryUploadsFailed(failedUploads),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: p.danger),
            ),
          ],
          const SizedBox(height: 32),
          AppButton(
            label: l10n.citizenReportViewReport,
            onPressed: () =>
                context.go('${areaOf(context)}/incident/$incidentId'),
          ),
          const SizedBox(height: 8),
          AppButton(
            label: l10n.citizenReportDone,
            variant: AppButtonVariant.ghost,
            onPressed: () => context.go(areaOf(context)),
          ),
        ],
      ),
    );
  }
}

/// No connection: the report is safe on the phone and will be sent by itself.
class _QueuedView extends StatelessWidget {
  const _QueuedView();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return ScreenScaffold(
      scroll: true,
      centered: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.cloud_off_rounded, size: 72, color: p.warning),
          const SizedBox(height: 16),
          Text(
            l10n.reportQueuedTitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.reportQueuedBody,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, height: 1.45, color: p.textMuted),
          ),
          const SizedBox(height: 24),
          Text(
            l10n.reportLocationCallHotline,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: p.textMuted),
          ),
          const SizedBox(height: 8),
          const _HotlineRow(),
          const SizedBox(height: 32),
          AppButton(
            label: l10n.citizenReportDone,
            onPressed: () => context.go(areaOf(context)),
          ),
        ],
      ),
    );
  }
}

class _HotlineRow extends StatelessWidget {
  const _HotlineRow();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Wrap(
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
            onPressed: () => unawaited(_call(number)),
          ),
      ],
    );
  }

  Future<void> _call(String number) =>
      launchUrl(Uri(scheme: 'tel', path: number));
}
