import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/presentation/widgets/phone_field.dart';
import '../data/user_repository.dart';

enum _VerifyStage { idle, codeSent }

/// Change and verify the account's phone number. Verification uses Firebase's
/// native phone auth (the OS handles the app-verification challenge), and the
/// backend only learns about the result through `sync-phone`.
class PhoneChangeSection extends ConsumerStatefulWidget {
  const PhoneChangeSection({required this.user, required this.resetKey, super.key});

  final AppUser user;

  /// Bumped by the parent on pull-to-refresh to drop any half-finished edit.
  final int resetKey;

  @override
  ConsumerState<PhoneChangeSection> createState() => _PhoneChangeSectionState();
}

class _PhoneChangeSectionState extends ConsumerState<PhoneChangeSection> {
  final _code = TextEditingController();

  bool _editing = false;
  bool _verifying = false;
  late String _localPhone = fromE164EgyptianPhone(widget.user.phone);
  bool _invalid = false;
  String? _pendingPhone;
  String? _formError;

  _VerifyStage _stage = _VerifyStage.idle;
  String? _verificationId;
  bool _sending = false;
  bool _confirming = false;
  bool _saving = false;
  String? _verifyError;

  bool get _isConfirming => _pendingPhone != null;

  @override
  void didUpdateWidget(PhoneChangeSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.resetKey != widget.resetKey) _resetAll();
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  void _resetAll() => setState(() {
        _editing = false;
        _verifying = false;
        _localPhone = fromE164EgyptianPhone(widget.user.phone);
        _invalid = false;
        _formError = null;
        _pendingPhone = null;
        _stage = _VerifyStage.idle;
        _verificationId = null;
        _verifyError = null;
        _code.clear();
      });

  void _onPhoneChanged(String value) => setState(() {
        _localPhone = value;
        _invalid = false;
        _formError = null;
        _pendingPhone = null;
      });

  void _submit() {
    final l10n = context.l10n;
    final e164 = toE164EgyptianPhone(_localPhone);

    // The same verified number is valid but not a change.
    if (widget.user.phoneVerified && e164 == widget.user.phone) {
      setState(() {
        _invalid = false;
        _formError = l10n.accountPhoneChangeSamePhoneError;
      });
      return;
    }
    if (!isValidEgyptianMobile(_localPhone)) {
      setState(() {
        _invalid = true;
        _formError = null;
      });
      return;
    }
    setState(() {
      _invalid = false;
      _formError = null;
      _pendingPhone = e164;
    });
  }

  Future<void> _confirmSave() async {
    final pending = _pendingPhone;
    if (pending == null) return;

    setState(() {
      _saving = true;
      _formError = null;
    });
    try {
      final updated = await ref.read(userRepositoryProvider).setUnverifiedPhone(pending);
      ref.read(authControllerProvider.notifier).updateUser(updated);
      if (mounted) {
        setState(() {
          _editing = false;
          _pendingPhone = null;
          _verifying = true;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _formError = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _sendCode() async {
    setState(() {
      _sending = true;
      _verifyError = null;
    });
    try {
      final id = await ref
          .read(authRepositoryProvider)
          .sendPhoneCode(toE164EgyptianPhone(_localPhone));
      if (mounted) {
        setState(() {
          _verificationId = id;
          _stage = _VerifyStage.codeSent;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _verifyError = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _confirmCode() async {
    final l10n = context.l10n;
    final verificationId = _verificationId;
    if (verificationId == null) return;

    setState(() {
      _confirming = true;
      _verifyError = null;
    });
    try {
      await ref.read(authRepositoryProvider).confirmPhoneCode(
            verificationId: verificationId,
            smsCode: _code.text.trim(),
          );
      final updated = await ref.read(userRepositoryProvider).syncPhone();
      ref.read(authControllerProvider.notifier).updateUser(updated);
      if (mounted) {
        setState(() {
          _verifying = false;
          _stage = _VerifyStage.idle;
          _code.clear();
        });
      }
    } on FirebaseAuthException catch (error) {
      final wrongCode = error.code == 'invalid-verification-code' || error.code == 'session-expired';
      if (mounted) {
        setState(() => _verifyError = wrongCode ? l10n.accountPhoneChangeCodeError : describeError(l10n, error));
      }
    } catch (error) {
      if (mounted) setState(() => _verifyError = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
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
                  Text(l10n.accountPhoneChangeLabel, style: TextStyle(fontSize: 12, color: p.textSubtle)),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        user.phone ?? '—',
                        textDirection: TextDirection.ltr,
                        style: TextStyle(fontSize: 15, color: p.text),
                      ),
                      const SizedBox(width: 6),
                      if (user.phone != null)
                        user.phoneVerified
                            ? const Icon(Icons.check_circle, size: 14, color: AppColors.emerald600)
                            : Text('(${l10n.accountUnverified})', style: TextStyle(fontSize: 12, color: p.textMuted)),
                    ],
                  ),
                ],
              ),
            ),
            if (!_editing && !_verifying)
              TextButton(
                onPressed: () => setState(() => _editing = true),
                child: Text(l10n.accountPhoneChangeChange),
              ),
          ],
        ),

        if (_editing) ...[
          const SizedBox(height: 8),
          PhoneField(
            value: _localPhone,
            showLabel: false,
            enabled: !_isConfirming,
            hasError: _invalid,
            onChanged: _onPhoneChanged,
          ),
          if (_formError != null) ...[
            const SizedBox(height: 8),
            Text(_formError!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 12),
          if (_isConfirming) ...[
            Text(
              l10n.accountPhoneChangeConfirmChangeMessage(_pendingPhone!),
              style: TextStyle(fontSize: 13, color: p.textMuted),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    label: l10n.accountPhoneChangeGoBack,
                    variant: AppButtonVariant.secondary,
                    onPressed: _saving ? null : () => setState(() => _pendingPhone = null),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: AppButton(
                    label: _saving ? l10n.commonSaving : l10n.accountPhoneChangeConfirmChange,
                    loading: _saving,
                    onPressed: _confirmSave,
                  ),
                ),
              ],
            ),
          ] else
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    label: l10n.accountPhoneChangeCancel,
                    variant: AppButtonVariant.secondary,
                    onPressed: _resetAll,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: AppButton(
                    label: l10n.accountPhoneChangeSave,
                    onPressed: _localPhone.isEmpty ? null : _submit,
                  ),
                ),
              ],
            ),
        ],

        if (!user.phoneVerified && user.phone != null && !_editing && !_verifying)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton(
              onPressed: () => setState(() => _verifying = true),
              child: Text(l10n.accountPhoneChangeVerifyNumber),
            ),
          ),

        if (_verifying) ...[
          const SizedBox(height: 12),
          if (_stage == _VerifyStage.idle)
            AppButton(
              label: _sending ? l10n.accountPhoneChangeSendingCode : l10n.accountPhoneChangeSendCode,
              variant: AppButtonVariant.secondary,
              loading: _sending,
              onPressed: _localPhone.isEmpty ? null : _sendCode,
            )
          else ...[
            AppTextField(
              controller: _code,
              hintText: l10n.accountPhoneChangeCodePlaceholder,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.oneTimeCode],
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            AppButton(
              label: l10n.commonConfirm,
              loading: _confirming,
              onPressed: _code.text.isEmpty ? null : _confirmCode,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _sending ? null : _sendCode,
              child: Text(l10n.accountPhoneChangeResendCode),
            ),
          ],
          if (_verifyError != null) ...[
            const SizedBox(height: 8),
            Text(_verifyError!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
        ],
      ],
    );
  }
}
