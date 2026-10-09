import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/app_version_label.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../../core/widgets/language_switcher.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/section_label.dart';
import '../../../core/widgets/segmented_choice.dart';
import '../../../core/widgets/states.dart';
import '../../../core/widgets/theme_switcher.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/app_user.dart';
import '../data/user_repository.dart';
import '../../../core/l10n/enum_labels.dart';
import 'email_change_section.dart';
import 'phone_change_section.dart';

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen> {
  bool _editing = false;

  /// Bumped on pull-to-refresh so child sections drop any half-finished edit.
  int _resetKey = 0;

  bool _resendingVerification = false;
  bool _verificationSent = false;

  Future<void> _refresh() async {
    setState(() {
      _resetKey++;
      _editing = false;
    });
    await ref.read(authControllerProvider.notifier).refreshProfile();
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

  Future<void> _resendVerification() async {
    setState(() {
      _resendingVerification = true;
      _verificationSent = false;
    });
    try {
      await ref.read(authRepositoryProvider).resendEmailVerification();
      if (mounted) setState(() => _verificationSent = true);
    } catch (_) {
      // Surfaced as "not sent": the link simply stays available to retry.
    } finally {
      if (mounted) setState(() => _resendingVerification = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final user = ref.watch(currentUserProvider);
    if (user == null) return LoadingView(label: l10n.commonLoading);

    return ScreenScaffold(
      scroll: true,
      onRefresh: _refresh,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(
            user: user,
            resending: _resendingVerification,
            verificationSent: _verificationSent,
            onResend: _resendVerification,
          ),
          const SizedBox(height: 16),
          _Section(
            title: _editing ? null : l10n.accountTitle,
            child: _editing
                ? _EditProfileForm(user: user, onDone: () => setState(() => _editing = false))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Align(
                        alignment: AlignmentDirectional.centerEnd,
                        child: TextButton.icon(
                          onPressed: () => setState(() => _editing = true),
                          icon: const Icon(Icons.edit_outlined, size: 16),
                          label: Text(l10n.accountEditProfile),
                        ),
                      ),
                      _ReadField(label: l10n.authCompleteProfileFirstName, value: user.firstName),
                      _ReadField(label: l10n.authCompleteProfileLastName, value: user.lastName),
                      _ReadField(label: l10n.accountRole, value: roleLabel(l10n, user.role)),
                      if (user.facilityName != null)
                        _ReadField(label: l10n.accountFacility, value: user.facilityName!),
                      _ReadField(label: l10n.authCompleteProfileAddress, value: user.address ?? ''),
                    ],
                  ),
          ),
          const SizedBox(height: 16),
          _Section(
            title: l10n.accountContact,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                EmailChangeSection(user: user),
                Divider(color: p.border, height: 32),
                PhoneChangeSection(user: user, resetKey: _resetKey),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const _Section(child: _PasswordSection()),
          const SizedBox(height: 16),
          const Row(
            children: [LanguageSwitcher(), SizedBox(width: 8), ThemeSwitcher()],
          ),
          const SizedBox(height: 16),
          const _LegalLinks(),
          const SizedBox(height: 16),
          AppButton(label: l10n.accountLogout, variant: AppButtonVariant.danger, onPressed: _logout),
          const SizedBox(height: 16),
          const Center(child: AppVersionLabel()),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.user,
    required this.resending,
    required this.verificationSent,
    required this.onResend,
  });

  final AppUser user;
  final bool resending;
  final bool verificationSent;
  final VoidCallback onResend;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: p.primary.withValues(alpha: 0.12),
              child: Text(
                user.initials,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: p.primary),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.fullName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: p.text),
                  ),
                  if (!user.emailVerified)
                    GestureDetector(
                      onTap: resending ? null : onResend,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          resending ? l10n.accountSendingVerification : l10n.accountSendVerificationEmail,
                          style: TextStyle(fontSize: 12, color: p.primary),
                        ),
                      ),
                    ),
                  if (verificationSent)
                    Text(
                      l10n.accountVerificationSent,
                      style: const TextStyle(fontSize: 12, color: AppColors.emerald600),
                    ),
                ],
              ),
            ),
          ],
        ),
        if (!user.role.isResponder) ...[
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: () => context.push('/citizen/account/incidents'),
            icon: const Icon(Icons.description_outlined, size: 18),
            label: Text(l10n.accountMyReports),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(46),
              foregroundColor: p.primary,
              side: BorderSide(color: p.border),
              backgroundColor: p.surface,
            ),
          ),
        ],
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.child, this.title});

  final String? title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null) ...[
            Text(
              title!,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: context.palette.text),
            ),
            const SizedBox(height: 8),
          ],
          child,
        ],
      ),
    );
  }
}

class _ReadField extends StatelessWidget {
  const _ReadField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: p.textSubtle)),
          const SizedBox(height: 2),
          Text(value.isEmpty ? '—' : value, style: TextStyle(fontSize: 15, color: p.text)),
        ],
      ),
    );
  }
}

class _EditProfileForm extends ConsumerStatefulWidget {
  const _EditProfileForm({required this.user, required this.onDone});

  final AppUser user;
  final VoidCallback onDone;

  @override
  ConsumerState<_EditProfileForm> createState() => _EditProfileFormState();
}

class _EditProfileFormState extends ConsumerState<_EditProfileForm> {
  late final _firstName = TextEditingController(text: widget.user.firstName);
  late final _lastName = TextEditingController(text: widget.user.lastName);
  late final _address = TextEditingController(text: widget.user.address ?? '');
  late Gender _gender = widget.user.gender ?? Gender.male;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final updated = await ref.read(userRepositoryProvider).updateProfile(
            widget.user.id,
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            gender: _gender,
            address: _address.text.trim(),
          );
      ref.read(authControllerProvider.notifier).updateUser(updated);
      widget.onDone();
    } catch (error) {
      if (mounted) setState(() => _error = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: AppTextField(label: l10n.authCompleteProfileFirstName, controller: _firstName),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AppTextField(label: l10n.authCompleteProfileLastName, controller: _lastName),
            ),
          ],
        ),
        const SizedBox(height: 12),
        AppTextField(label: l10n.authCompleteProfileAddress, controller: _address),
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
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: AppButton(
                label: l10n.commonCancel,
                variant: AppButtonVariant.secondary,
                onPressed: _saving ? null : widget.onDone,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AppButton(
                label: _saving ? l10n.commonSaving : l10n.accountSaveChanges,
                loading: _saving,
                onPressed: _save,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _PasswordSection extends ConsumerStatefulWidget {
  const _PasswordSection();

  @override
  ConsumerState<_PasswordSection> createState() => _PasswordSectionState();
}

class _PasswordSectionState extends ConsumerState<_PasswordSection> {
  final _current = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();

  bool _expanded = false;
  bool _updating = false;
  bool _success = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    setState(() {
      _error = null;
      _success = false;
    });
    if (_new.text != _confirm.text) {
      setState(() => _error = l10n.accountPasswordsDontMatch);
      return;
    }

    setState(() => _updating = true);
    try {
      await ref.read(authRepositoryProvider).changePassword(
            currentPassword: _current.text,
            newPassword: _new.text,
          );
      _current.clear();
      _new.clear();
      _confirm.clear();
      if (mounted) setState(() => _success = true);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    if (!ref.read(authRepositoryProvider).hasPasswordProvider) {
      return Text(l10n.accountGoogleOnlyNotice, style: TextStyle(fontSize: 13, color: p.textMuted));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Text(
            _expanded ? l10n.accountHidePasswordSettings : l10n.accountChangePassword,
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: p.primary),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 12),
          AppTextField(label: l10n.accountCurrentPassword, controller: _current, obscureText: true),
          const SizedBox(height: 12),
          AppTextField(
            label: l10n.accountNewPassword,
            controller: _new,
            obscureText: true,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          AppTextField(
            label: l10n.accountConfirmNewPassword,
            controller: _confirm,
            obscureText: true,
            onChanged: (_) => setState(() {}),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          if (_success) ...[
            const SizedBox(height: 12),
            Text(
              l10n.accountPasswordUpdated,
              style: const TextStyle(fontSize: 13, color: AppColors.emerald600),
            ),
          ],
          const SizedBox(height: 12),
          AppButton(
            label: _updating ? l10n.accountUpdating : l10n.accountChangePassword,
            loading: _updating,
            onPressed: _current.text.isEmpty || _new.text.isEmpty || _confirm.text.isEmpty ? null : _submit,
          ),
        ],
      ],
    );
  }
}

class _LegalLinks extends StatelessWidget {
  const _LegalLinks();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    final links = [
      (l10n.accountAboutLink, '/about'),
      (l10n.accountPrivacyLink, '/privacy'),
      (l10n.accountTermsLink, '/terms'),
      (l10n.accountSupportLink, '/support'),
    ];

    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text(
                l10n.accountLegal.toUpperCase(),
                style: TextStyle(fontSize: 12, letterSpacing: 0.6, color: p.textSubtle),
              ),
            ),
          ),
          for (final (label, path) in links)
            ListTile(
              dense: true,
              title: Text(label, style: TextStyle(fontSize: 15, color: p.text)),
              trailing: Icon(Icons.chevron_right, size: 18, color: p.textSubtle),
              onTap: () => context.push(path),
            ),
        ],
      ),
    );
  }
}
