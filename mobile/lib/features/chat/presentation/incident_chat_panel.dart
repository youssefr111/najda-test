import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/domain/role.dart';
import '../application/chat_providers.dart';
import '../data/chat_repository.dart';
import '../domain/chat_message.dart';

/// In-incident chat between the citizen and the responding units.
/// [readOnly] is true once the incident (or the responder's part in it) is
/// over: history stays readable, the composer disappears.
class IncidentChatPanel extends ConsumerStatefulWidget {
  const IncidentChatPanel({
    required this.incidentId,
    required this.readOnly,
    super.key,
  });

  final int incidentId;
  final bool readOnly;

  @override
  ConsumerState<IncidentChatPanel> createState() => _IncidentChatPanelState();
}

class _IncidentChatPanelState extends ConsumerState<IncidentChatPanel> {
  static const _maxLength = 1000;

  final _input = TextEditingController();
  final _scroll = ScrollController();

  bool _sending = false;
  String? _error;
  int _lastCount = 0;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(chatRepositoryProvider).send(widget.incidentId, text);
      _input.clear();
      ref.invalidate(chatMessagesProvider(widget.incidentId));
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final me = ref.watch(currentUserProvider);
    final messages = ref.watch(chatMessagesProvider(widget.incidentId));

    final list = messages.value;
    if (list != null && list.length != _lastCount) {
      _lastCount = list.length;
      _scrollToEnd();
    }

    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 280,
            child: switch (messages) {
              AsyncData(:final value) when value.isEmpty => _Centered(
                l10n.chatNoMessages,
              ),
              AsyncData(:final value) => ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.all(12),
                itemCount: value.length,
                itemBuilder: (context, index) => _Bubble(
                  message: value[index],
                  mine: value[index].senderId == me?.id,
                ),
              ),
              AsyncError(:final error) => _Centered(
                describeError(l10n, error),
                error: true,
              ),
              _ => _Centered(l10n.chatLoading),
            },
          ),
          Divider(height: 1, color: p.border),
          if (widget.readOnly)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                l10n.chatReadOnly,
                style: TextStyle(fontSize: 13, color: p.textMuted),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(4, 0, 4, 6),
                      child: Text(
                        _error!,
                        style: TextStyle(fontSize: 12, color: p.danger),
                      ),
                    ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _input,
                          minLines: 1,
                          maxLines: 4,
                          maxLength: _maxLength,
                          textCapitalization: TextCapitalization.sentences,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(),
                          onChanged: (_) => setState(() {}),
                          style: TextStyle(fontSize: 15, color: p.text),
                          decoration: InputDecoration(
                            hintText: l10n.chatPlaceholder,
                            counterText: '',
                            isDense: true,
                            filled: true,
                            fillColor: p.surfaceAlt,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(20),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      IconButton.filled(
                        tooltip: l10n.chatSend,
                        onPressed: _sending || _input.text.trim().isEmpty
                            ? null
                            : _send,
                        icon: _sending
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.send_rounded, size: 20),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Centered extends StatelessWidget {
  const _Centered(this.text, {this.error = false});

  final String text;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: error ? p.danger : p.textMuted),
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.mine});

  final ChatMessage message;
  final bool mine;

  String _roleLabel(AppLocalizations l10n) {
    if (message.senderRole == 'CITIZEN') return l10n.chatCaller;
    try {
      return roleLabel(l10n, Role.fromJson(message.senderRole));
    } on FormatException {
      return message.senderRole;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();

    return Align(
      alignment: mine
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.72,
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: mine ? p.primary : p.surfaceAlt,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!mine)
                Text(
                  '${message.senderName} · ${_roleLabel(l10n)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: p.textMuted,
                  ),
                ),
              Text(
                message.content,
                style: TextStyle(
                  fontSize: 15,
                  color: mine ? p.onPrimary : p.text,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                DateFormat.jm(locale).format(message.sentAt),
                style: TextStyle(
                  fontSize: 10,
                  color: mine
                      ? p.onPrimary.withValues(alpha: 0.75)
                      : p.textSubtle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
