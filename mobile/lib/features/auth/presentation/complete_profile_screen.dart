import '../../../core/address/address.dart';
import '../../../core/widgets/address_fields.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/section_label.dart';
import '../../../core/widgets/segmented_choice.dart';
import '../../account/data/user_repository.dart';
import '../application/auth_controller.dart';
import '../domain/app_user.dart';
import 'widgets/phone_field.dart';

/// Shown for accounts that exist but are not complete yet -- in practice,
/// Google sign-ups (no phone/address/gender). No password is asked for: these accounts sign in with Google. Email + password
/// registrations collect all of this up front and never reach this screen.
class CompleteProfileScreen extends ConsumerStatefulWidget {
  const CompleteProfileScreen({required this.user, super.key});

  final AppUser user;

  @override
  ConsumerState<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends ConsumerState<CompleteProfileScreen> {
  late final _firstName = TextEditingController(text: widget.user.firstName);
  late final _lastName = TextEditingController(text: widget.user.lastName);
  late AddressValue _address = widget.user.addressDetails ?? const AddressValue();
  bool _showAddressErrors = false;

  late Gender _gender = widget.user.gender ?? Gender.male;
  late String _localPhone = fromE164EgyptianPhone(widget.user.phone);
  bool _phoneInvalid = false;
  String? _error;
  bool _submitting = false;

  bool get _phoneAlreadyVerified => widget.user.hasVerifiedPhone;

  @override
  void dispose() {
    for (final controller in [_firstName, _lastName]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    setState(() => _error = null);

    if (!_phoneAlreadyVerified && !isValidEgyptianMobile(_localPhone)) {
      setState(() {
        _phoneInvalid = true;
        _error = l10n.authCompleteProfileInvalidPhone;
      });
      return;
    }
    setState(() => _phoneInvalid = false);

    setState(() => _submitting = true);
    try {
      final users = ref.read(userRepositoryProvider);

      // ONE request saves the whole profile. (Separate profile + phone requests sent together used to
      // overwrite each other on the server, which is why the first tap could appear to do nothing.)
      await users.completeProfile(
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        gender: _gender,
        address: _address,
        phone: _phoneAlreadyVerified ? null : toE164EgyptianPhone(_localPhone),
      );

      // The backend recomputes profileCompleted from all three; re-read it.
      // The router then moves the user on automatically.
      await ref.read(authControllerProvider.notifier).refreshProfile();
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _logout() async {
    final l10n = context.l10n;
    final confirmed = await confirmAction(
      context,
      title: l10n.accountLogoutConfirm,
      confirmLabel: l10n.accountLogout,
      destructive: true,
    );
    if (confirmed) await ref.read(authControllerProvider.notifier).signOut();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          Text(
            l10n.authCompleteProfileTitle,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: p.text),
          ),
          const SizedBox(height: 4),
          Text(l10n.authCompleteProfileSubtitle, style: TextStyle(fontSize: 15, color: p.textMuted)),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AppTextField(
                  label: l10n.authCompleteProfileFirstName,
                  controller: _firstName,
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppTextField(
                  label: l10n.authCompleteProfileLastName,
                  controller: _lastName,
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_phoneAlreadyVerified)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionLabel(l10n.authCompleteProfilePhone),
                const SizedBox(height: 6),
                Text(
                  '${widget.user.phone} · ${l10n.authCompleteProfilePhoneVerified}',
                  textDirection: TextDirection.ltr,
                  style: TextStyle(color: p.text),
                ),
              ],
            )
          else
            PhoneField(
              value: _localPhone,
              hasError: _phoneInvalid,
              onChanged: (value) => setState(() {
                _localPhone = value;
                _phoneInvalid = false;
              }),
            ),
          const SizedBox(height: 12),
          AddressFields(
            value: _address,
            showErrors: _showAddressErrors,
            onChanged: (value) => setState(() => _address = value),
          ),
          const SizedBox(height: 12),
          SectionLabel(l10n.authCompleteProfileGender),
          const SizedBox(height: 6),
          SegmentedChoice<Gender>(
            options: Gender.values,
            value: _gender,
            labelOf: (g) => g == Gender.male ? l10n.enumsGenderMale : l10n.enumsGenderFemale,
            onChanged: (g) => setState(() => _gender = g),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 12),
          AppButton(
            label: _submitting ? l10n.commonSaving : l10n.authCompleteProfileSave,
            loading: _submitting,
            onPressed: _firstName.text.isEmpty || _lastName.text.isEmpty
                ? null
                : () {
                    if (!_address.isValid) {
                      setState(() => _showAddressErrors = true);
                      return;
                    }
                    _submit();
                  },
          ),
          const SizedBox(height: 12),
          AppButton(label: l10n.accountLogout, variant: AppButtonVariant.danger, onPressed: _logout),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
