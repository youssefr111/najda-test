import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/app_user.dart';
import '../data/user_repository.dart';

class EmailChangeSection extends ConsumerStatefulWidget {
  const EmailChangeSection({required this.user, super.key});

  final AppUser user;

  @override
  ConsumerState<EmailChangeSection> createState() => _EmailChangeSectionState();
}

class _EmailChangeSectionState extends ConsumerState<EmailChangeSection> {
  late final _newEmail = TextEditingController(text: widget.user.email);

  bool _editing = false;
  bool _sending = false;
  String? _error;

  /// The address we had when the link was requested; non-null while we wait
  /// for the user to click the confirmation link.
  String? _pendingFrom;
  Timer? _watcher;

  @override
  void dispose() {
    _watcher?.cancel();
    _newEmail.dispose();
    super.dispose();
  }

  Future<void> _sendLink() async {
    final l10n = context.l10n;
    final repository = ref.read(authRepositoryProvider);
    final target = _newEmail.text.trim();

    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      if (await repository.emailExists(target)) {
        if (mounted) setState(() => _error = l10n.accountEmailChangeEmailAlreadyInUse);
        return;
      }
      await repository.requestEmailChange(target);
      if (!mounted) return;
      setState(() {
        _pendingFrom = widget.user.email;
        _editing = false;
      });
      _startWatching();
    } on FirebaseAuthException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.code == 'email-already-in-use'
            ? l10n.accountEmailChangeEmailAlreadyInUse
            : describeError(l10n, error);
      });
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// There is no event for "the confirmation link was clicked" (it happens on
  /// a Firebase-hosted page), so the only way to find out is to reload.
  void _startWatching() {
    _watcher?.cancel();
    _watcher = Timer.periodic(const Duration(seconds: 5), (timer) async {
      final previous = _pendingFrom;
      if (previous == null) return;
      try {
        final repository = ref.read(authRepositoryProvider);
        final current = await repository.reloadAndGetEmail();
        if (current == null || current == previous) return;

        timer.cancel();
        await repository.forceTokenRefresh();
        final updated = await ref.read(userRepositoryProvider).syncEmail();
        ref.read(authControllerProvider.notifier).updateUser(updated);
        if (mounted) setState(() => _pendingFrom = null);
      } catch (_) {
        // Transient network hiccup: the next tick retries.
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final user = widget.user;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.accountEmail, style: TextStyle(fontSize: 12, color: p.textSubtle)),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          user.email,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 15, color: p.text),
                        ),
                      ),
                      const SizedBox(width: 6),
                      if (user.emailVerified)
                        const Icon(Icons.check_circle, size: 14, color: AppColors.emerald600)
                      else
                        Text('(${l10n.accountUnverified})', style: TextStyle(fontSize: 12, color: p.textMuted)),
                    ],
                  ),
                ],
              ),
            ),
            if (!_editing && _pendingFrom == null)
              TextButton(
                onPressed: () => setState(() {
                  _newEmail.text = user.email;
                  _editing = true;
                }),
                child: Text(l10n.accountEmailChangeChange),
              ),
          ],
        ),
        if (_editing) ...[
          const SizedBox(height: 8),
          AppTextField(
            controller: _newEmail,
            hintText: l10n.accountEmailChangeNewEmailPlaceholder,
            keyboardType: TextInputType.emailAddress,
            onChanged: (_) => setState(() {}),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  label: l10n.accountEmailChangeCancel,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => setState(() {
                    _editing = false;
                    _error = null;
                  }),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton(
                  label: _sending ? l10n.commonSending : l10n.accountEmailChangeSendLink,
                  loading: _sending,
                  onPressed: _newEmail.text.trim().isEmpty || _newEmail.text.trim() == user.email
                      ? null
                      : _sendLink,
                ),
              ),
            ],
          ),
        ],
        if (_pendingFrom != null) ...[
          const SizedBox(height: 8),
          Text(
            '${l10n.accountEmailChangeConfirmationSentBefore} ${_newEmail.text.trim()}. '
            '${l10n.accountEmailChangeConfirmationSentAfter}',
            style: TextStyle(fontSize: 13, color: p.textMuted),
          ),
        ],
      ],
    );
  }
}
