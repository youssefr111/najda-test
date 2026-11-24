import '../../kyc/presentation/kyc_card.dart';
import '../../kyc/application/kyc_providers.dart';
import '../../../core/address/address.dart';
import '../../../core/widgets/address_fields.dart';
import '../../../core/router/route_paths.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_tab_bar.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/section_label.dart';
import '../../../core/widgets/segmented_choice.dart';
import '../../../core/widgets/states.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/domain/role.dart';
import '../../medical/presentation/medical_profile_card.dart';
import '../../settings/presentation/settings_screen.dart';
import '../../settings/presentation/widgets/settings_widgets.dart';
import '../data/user_repository.dart';
import 'email_change_section.dart';
import 'phone_change_section.dart';

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

enum _AccountTab { account, security, medical }

class _AccountScreenState extends ConsumerState<AccountScreen> {
  _AccountTab _tab = _AccountTab.account;
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
    final kyc = ref
        .refresh(kycStateProvider.future)
        .then<void>((_) {}, onError: (Object _) {});
    await ref.read(authControllerProvider.notifier).refreshProfile();
    await kyc;
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

    final tabs = [
      AppTab(
        id: _AccountTab.account,
        label: l10n.accountTabAccount,
        icon: Icons.person_outline_rounded,
      ),
      AppTab(
        id: _AccountTab.security,
        label: l10n.accountTabSecurity,
        icon: Icons.shield_outlined,
      ),
      AppTab(
        id: _AccountTab.medical,
        label: l10n.accountTabMedical,
        icon: Icons.monitor_heart_outlined,
      ),
    ];

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
          // Citizens and responders both file reports; only citizens can apply to become a responder.
          if (user.role == Role.citizen || user.role.isResponder) ...[
            const SizedBox(height: 16),
            SettingsGroup(
              children: [
                SettingsTile(
                  icon: Icons.description_outlined,
                  title: l10n.accountMyReports,
                  trailing: const SettingsChevron(),
                  onTap: () =>
                      context.push('${areaOf(context)}/account/incidents'),
                ),
                if (user.role == Role.citizen)
                  SettingsTile(
                    icon: Icons.local_police_outlined,
                    title: l10n.accountBecomeResponder,
                    trailing: const SettingsChevron(),
                    onTap: () =>
                        context.push('/citizen/account/become-responder'),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          AppTabBar<_AccountTab>(
            tabs: tabs,
            value: _tab,
            semanticLabel: l10n.accountTabsLabel,
            onChanged: (tab) => setState(() => _tab = tab),
          ),
          const SizedBox(height: 16),
          // Panels stay mounted (only hidden) so unsaved input survives a tab switch.
          Visibility(
            visible: _tab == _AccountTab.account,
            maintainState: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Section(
                  title: _editing ? null : l10n.accountTitle,
                  trailing: _editing
                      ? null
                      : TextButton.icon(
                          onPressed: () => setState(() => _editing = true),
                          icon: const Icon(Icons.edit_outlined, size: 16),
                          label: Text(l10n.accountEditProfile),
                        ),
                  child: _editing
                      ? _EditProfileForm(
                          user: user,
                          onDone: () => setState(() => _editing = false),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _ReadField(
                              label: l10n.authCompleteProfileFirstName,
                              value: user.firstName,
                            ),
                            _ReadField(
                              label: l10n.authCompleteProfileLastName,
                              value: user.lastName,
                            ),
                            // "Citizen" tells an ordinary user nothing; only show the role when it is meaningful.
                            if (user.role != Role.citizen)
                              _ReadField(
                                label: l10n.accountRole,
                                value: roleLabel(l10n, user.role),
                              ),
                            if (user.facilityName != null)
                              _ReadField(
                                label: l10n.accountFacility,
                                value: user.facilityName!,
                              ),
                            _ReadField(
                              label: l10n.authCompleteProfileAddress,
                              value:
                                  user.addressDetails?.format(
                                    Localizations.localeOf(
                                      context,
                                    ).languageCode,
                                  ) ??
                                  '',
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: 16),
                const KycCard(),
              ],
            ),
          ),
          Visibility(
            visible: _tab == _AccountTab.security,
            maintainState: true,
            // How to reach you (email, phone) sits with how you sign in: contact details first, then the password.
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
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
              ],
            ),
          ),
          Visibility(
            visible: _tab == _AccountTab.medical,
            maintainState: true,
            child: const MedicalProfileCard(),
          ),
          const SizedBox(height: 24),
          // App-level settings are not about the person, so they come last
          // and stay visible whichever tab is open.
          const SettingsEntryCard(),
          const SizedBox(height: 16),
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
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: p.primary,
                ),
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
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  if (!user.emailVerified)
                    GestureDetector(
                      onTap: resending ? null : onResend,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          resending
                              ? l10n.accountSendingVerification
                              : l10n.accountSendVerificationEmail,
                          style: TextStyle(fontSize: 12, color: p.primary),
                        ),
                      ),
                    ),
                  if (verificationSent)
                    Text(
                      l10n.accountVerificationSent,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.emerald600,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.child, this.title, this.trailing});

  final String? title;

  /// An action aligned to the end of the title row (e.g. "Edit").
  final Widget? trailing;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null) ...[
            Row(
              children: [
                Expanded(
                  child: Text(
                    title!,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: context.palette.text,
                    ),
                  ),
                ),
                ?trailing,
              ],
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
          Text(
            value.isEmpty ? '—' : value,
            style: TextStyle(fontSize: 15, color: p.text),
          ),
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
  late AddressValue _address =
      widget.user.addressDetails ?? const AddressValue();
  bool _showAddressErrors = false;
  late Gender _gender = widget.user.gender ?? Gender.male;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_address.isValid) {
      setState(() => _showAddressErrors = true);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final updated = await ref
          .read(userRepositoryProvider)
          .updateProfile(
            widget.user.id,
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            gender: _gender,
            address: _address,
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
              child: AppTextField(
                label: l10n.authCompleteProfileFirstName,
                controller: _firstName,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AppTextField(
                label: l10n.authCompleteProfileLastName,
                controller: _lastName,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        AddressFields(
          value: _address,
          showErrors: _showAddressErrors,
          onChanged: (value) => _address = value,
        ),
        const SizedBox(height: 12),
        SectionLabel(l10n.authCompleteProfileGender),
        const SizedBox(height: 6),
        SegmentedChoice<Gender>(
          options: Gender.values,
          value: _gender,
          labelOf: (g) =>
              g == Gender.male ? l10n.enumsGenderMale : l10n.enumsGenderFemale,
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
      await ref
          .read(authRepositoryProvider)
          .changePassword(
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
      return Text(
        l10n.accountGoogleOnlyNotice,
        style: TextStyle(fontSize: 13, color: p.textMuted),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Text(
            _expanded
                ? l10n.accountHidePasswordSettings
                : l10n.accountChangePassword,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: p.primary,
            ),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 12),
          AppTextField(
            label: l10n.accountCurrentPassword,
            controller: _current,
            obscureText: true,
          ),
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
            label: _updating
                ? l10n.accountUpdating
                : l10n.accountChangePassword,
            loading: _updating,
            onPressed:
                _current.text.isEmpty ||
                    _new.text.isEmpty ||
                    _confirm.text.isEmpty
                ? null
                : _submit,
          ),
        ],
      ],
    );
  }
}
