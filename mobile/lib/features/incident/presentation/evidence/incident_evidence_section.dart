import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/section_label.dart';
import '../../application/incident_providers.dart';
import '../../data/incident_media_repository.dart';
import '../../domain/incident.dart';
import 'evidence_capture_bar.dart';
import 'incident_media_gallery.dart';
import '../../domain/pending_attachment.dart';

class IncidentEvidenceSection extends ConsumerStatefulWidget {
  const IncidentEvidenceSection({
    required this.incident,
    required this.isOwner,
    super.key,
  });

  final Incident incident;

  /// The reporting citizen may edit and add; everyone else only views.
  final bool isOwner;

  @override
  ConsumerState<IncidentEvidenceSection> createState() =>
      _IncidentEvidenceSectionState();
}

class _IncidentEvidenceSectionState
    extends ConsumerState<IncidentEvidenceSection> {
  final _message = TextEditingController();

  bool _editing = false;
  bool _saving = false;
  int _uploading = 0;
  String? _error;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<void> _upload(PendingAttachment attachment) async {
    final l10n = context.l10n;
    setState(() {
      _uploading++;
      _error = null;
    });
    try {
      await ref
          .read(incidentMediaRepositoryProvider)
          .upload(
            incidentId: widget.incident.id,
            kind: attachment.kind,
            path: attachment.path,
          );
      ref.invalidate(incidentProvider(widget.incident.id));
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n.myActiveIncidentPanelMediaError);
      }
    } finally {
      if (mounted) setState(() => _uploading--);
    }
  }

  Future<void> _saveMessage(int mediaId) async {
    final l10n = context.l10n;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(incidentMediaRepositoryProvider)
          .editText(mediaId, _message.text.trim());
      ref.invalidate(incidentProvider(widget.incident.id));
      if (mounted) setState(() => _editing = false);
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n.myActiveIncidentPanelUpdateError);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final incident = widget.incident;
    final message = incident.messageMedia;
    final evidence = incident.evidence;

    final canEditMessage =
        widget.isOwner &&
        incident.status.isEditableByCitizen &&
        message != null;
    final canAdd = widget.isOwner && incident.status.acceptsEvidence;
    final locked = widget.isOwner && incident.status.cancelNeedsReason;

    if (message == null && evidence.isEmpty && !canAdd) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (message != null && (message.textContent ?? '').isNotEmpty) ...[
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: SectionLabel(
                        l10n.myActiveIncidentPanelYourMessage,
                      ),
                    ),
                    if (canEditMessage && !_editing)
                      TextButton(
                        onPressed: () => setState(() {
                          _message.text = message.textContent ?? '';
                          _editing = true;
                        }),
                        child: Text(l10n.accountEditProfile),
                      ),
                  ],
                ),
                if (_editing) ...[
                  AppTextField(
                    controller: _message,
                    minLines: 2,
                    maxLines: 5,
                    maxLength: 1000,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: AppButton(
                          label: l10n.commonCancel,
                          variant: AppButtonVariant.secondary,
                          onPressed: _saving
                              ? null
                              : () => setState(() => _editing = false),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: AppButton(
                          label: l10n.commonSave,
                          loading: _saving,
                          onPressed: () => _saveMessage(message.id),
                        ),
                      ),
                    ],
                  ),
                ] else
                  Text(
                    message.textContent!,
                    style: TextStyle(fontSize: 15, color: p.text),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (evidence.isNotEmpty) ...[
          IncidentMediaGallery(
            incidentId: incident.id,
            items: evidence,
            canDelete: widget.isOwner && incident.status.isEditableByCitizen,
          ),
          const SizedBox(height: 12),
        ],
        if (canAdd) ...[
          SectionLabel(l10n.myActiveIncidentPanelAddMedia),
          const SizedBox(height: 8),
          EvidenceCaptureBar(enabled: _uploading == 0, onCaptured: _upload),
          if (_uploading > 0) ...[
            const SizedBox(height: 8),
            Text(
              l10n.myActiveIncidentPanelUploading,
              style: TextStyle(fontSize: 13, color: p.textMuted),
            ),
          ],
        ],
        if (locked) ...[
          const SizedBox(height: 8),
          Text(
            l10n.myActiveIncidentPanelLockedHint,
            style: TextStyle(fontSize: 12, color: p.textMuted),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
        ],
      ],
    );
  }
}
