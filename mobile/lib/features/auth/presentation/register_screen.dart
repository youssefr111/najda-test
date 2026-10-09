import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/section_label.dart';
import '../../../core/widgets/segmented_choice.dart';
import '../../../core/widgets/states.dart';
import '../application/auth_controller.dart';
import '../application/email_availability.dart';
import '../application/email_otp_controller.dart';
import '../data/auth_repository.dart';
import '../data/registration_repository.dart';
import '../domain/app_user.dart';
import '../domain/auth_state.dart';
import 'widgets/auth_header.dart';
import 'widgets/google_sign_in_button.dart';
import 'widgets/password_requirements.dart';
import 'widgets/phone_field.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _address = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();

  String _localPhone = '';
  bool _phoneInvalid = false;
  Gender _gender = Gender.male;
  bool _agreed = false;
  String? _error;
  bool _submitting = false;

  String get _emailTrimmed => _email.text.trim();

  @override
  void dispose() {
    for (final controller in [_firstName, _lastName, _email, _code, _address, _password, _confirmPassword]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _onEmailChanged(String _) {
    // A verification only ever applies to one address.
    _code.clear();
    ref.read(emailOtpControllerProvider.notifier).reset();
    setState(() {});
  }

  Future<void> _sendCode() async {
    final l10n = context.l10n;
    setState(() => _error = null);
    try {
      await ref.read(emailOtpControllerProvider.notifier).send(_emailTrimmed);
      _code.clear();
    } catch (error) {
      _showError(
        error,
        {
          409: l10n.authRegisterEmailTaken,
          429: l10n.authRegisterTooManyRequests,
          503: l10n.authRegisterEmailServiceUnavailable,
        },
      );
    }
  }

  Future<void> _verifyCode() async {
    final l10n = context.l10n;
    setState(() => _error = null);
    try {
      await ref.read(emailOtpControllerProvider.notifier).verify(_emailTrimmed, _code.text.trim());
    } catch (error) {
      _showError(
        error,
        {
          400: l10n.authRegisterInvalidCode,
          429: l10n.authRegisterTooManyAttempts,
        },
      );
    }
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    final otp = ref.read(emailOtpControllerProvider);
    setState(() => _error = null);

    String? validationError;
    if (!_agreed) {
      validationError = l10n.authRegisterAgreeRequired;
    } else if (!otp.isVerified) {
      validationError = l10n.authRegisterVerifyEmailFirst;
    } else if (!isValidEgyptianMobile(_localPhone)) {
      setState(() => _phoneInvalid = true);
      validationError = l10n.authPhoneInvalid;
    } else if (!isPasswordValid(_password.text)) {
      validationError = l10n.authRegisterPasswordInvalid;
    } else if (_password.text != _confirmPassword.text) {
      validationError = l10n.authRegisterPasswordMismatch;
    }
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }

    setState(() => _submitting = true);
    try {
      await ref.read(registrationRepositoryProvider).registerWithPassword(
            PasswordRegistration(
              firstName: _firstName.text.trim(),
              lastName: _lastName.text.trim(),
              email: _emailTrimmed,
              password: _password.text,
              verificationToken: otp.verificationToken!,
              phone: toE164EgyptianPhone(_localPhone),
              address: _address.text.trim(),
              gender: _gender,
            ),
          );
      await ref
          .read(authRepositoryProvider)
          .signInWithEmail(_emailTrimmed.toLowerCase(), _password.text);
      // Nothing else to do: the profile is already complete, so the router
      // sends the new user straight into the app once the session resolves.
    } catch (error) {
      if (error is ApiException && error.status == 403) {
        ref.read(emailOtpControllerProvider.notifier).reset(); // verification expired
      }
      _showError(
        error,
        {
          403: l10n.authRegisterVerificationExpired,
          409: l10n.authRegisterEmailTaken,
          422: l10n.authRegisterPhoneAlreadyUsed,
        },
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _onGoogleSignedIn(UserCredential credential) async {
    final repository = ref.read(authRepositoryProvider);
    final isNewUser = credential.additionalUserInfo?.isNewUser ?? false;

    if (!_agreed) {
      // Only delete a user this exact sign-in just created -- never one we
      // merely signed into, or we would destroy a real account.
      if (isNewUser) {
        await repository.deleteCurrentUserQuietly();
      } else {
        await repository.signOut();
      }
      if (mounted) setState(() => _error = context.l10n.authRegisterAgreeRequired);
      return;
    }

    // Existing account: treat as a login. The AuthController already has the
    // profile fetch in flight and the router redirects when it resolves.
    if (!isNewUser) return;

    var registered = false;
    try {
      final name = _splitDisplayName(credential.user?.displayName);
      await ref.read(registrationRepositoryProvider).registerGoogleCitizen(
            firstName: name.$1,
            lastName: name.$2,
            email: credential.user?.email ?? '',
          );
      registered = true;
      await ref.read(authControllerProvider.notifier).refreshProfile();
    } catch (error) {
      // isNewUser is true, so this Firebase user was minted by this very call;
      // rolling it back on a genuine registration failure is correct.
      if (!registered) await repository.deleteCurrentUserQuietly();
      if (mounted) _showError(error, const {});
    }
  }

  (String, String) _splitDisplayName(String? displayName) {
    final parts = (displayName ?? '').trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return ('', '');
    return (parts.first, parts.skip(1).join(' '));
  }

  void _showError(Object error, Map<int, String> byStatus) {
    if (!mounted) return;
    setState(() => _error = describeError(context.l10n, error, byStatus: byStatus));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final otp = ref.watch(emailOtpControllerProvider);
    final availability = ref.watch(emailAvailabilityProvider(_email.text)).valueOrNull;
    final checkingProfile = ref.watch(authControllerProvider) is AuthCheckingProfile;

    final busy = _submitting || otp.pending;
    final emailTaken = availability == EmailAvailability.taken;

    final emailHint = switch (availability) {
      EmailAvailability.checking => (l10n.authRegisterEmailChecking, p.textSubtle),
      EmailAvailability.available => (l10n.authRegisterEmailAvailable, AppColors.emerald600),
      _ => null,
    };

    final canSubmit = !busy &&
        _agreed &&
        otp.isVerified &&
        _firstName.text.isNotEmpty &&
        _lastName.text.isNotEmpty &&
        _localPhone.isNotEmpty &&
        _address.text.isNotEmpty &&
        _password.text.isNotEmpty &&
        _confirmPassword.text.isNotEmpty;

    return Stack(
      children: [
        ScreenScaffold(
          scroll: true,
          centered: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AuthHeader(subtitle: l10n.authRegisterSubtitle),
              AuthPanel(
                children: [
                  GoogleSignInButton(
                    label: l10n.authRegisterContinueWithGoogle,
                    enabled: _agreed,
                    onSignedIn: _onGoogleSignedIn,
                    onError: (error) => _showError(error, const {}),
                  ),
                  OrDivider(label: l10n.authRegisterOr),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: AppTextField(
                          label: l10n.authRegisterFirstNameLabel,
                          controller: _firstName,
                          onChanged: (_) => setState(() {}),
                          textCapitalization: TextCapitalization.words,
                          autofillHints: const [AutofillHints.givenName],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: AppTextField(
                          label: l10n.authRegisterLastNameLabel,
                          controller: _lastName,
                          onChanged: (_) => setState(() {}),
                          textCapitalization: TextCapitalization.words,
                          autofillHints: const [AutofillHints.familyName],
                        ),
                      ),
                    ],
                  ),
                  AppTextField(
                    label: l10n.authRegisterEmailLabel,
                    controller: _email,
                    onChanged: _onEmailChanged,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    errorText: emailTaken ? l10n.authRegisterEmailTaken : null,
                  ),
                  if (emailHint != null)
                    Text(emailHint.$1, style: TextStyle(fontSize: 12, color: emailHint.$2)),
                  if (otp.isVerified)
                    Row(
                      children: [
                        const Icon(Icons.check_circle, size: 16, color: AppColors.emerald600),
                        const SizedBox(width: 6),
                        Text(
                          l10n.authRegisterEmailVerified,
                          style: const TextStyle(fontSize: 13, color: AppColors.emerald600),
                        ),
                      ],
                    )
                  else
                    _OtpBlock(
                      otp: otp,
                      busy: busy,
                      emailTrimmed: _emailTrimmed,
                      emailTaken: emailTaken,
                      codeController: _code,
                      onCodeChanged: (_) => setState(() {}),
                      onSend: _sendCode,
                      onVerify: _verifyCode,
                    ),
                  PhoneField(
                    value: _localPhone,
                    hasError: _phoneInvalid,
                    onChanged: (value) => setState(() {
                      _localPhone = value;
                      _phoneInvalid = false;
                    }),
                  ),
                  AppTextField(
                    label: l10n.authRegisterAddressLabel,
                    controller: _address,
                    onChanged: (_) => setState(() {}),
                    textCapitalization: TextCapitalization.sentences,
                    autofillHints: const [AutofillHints.fullStreetAddress],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SectionLabel(l10n.authRegisterGenderLabel),
                      const SizedBox(height: 6),
                      SegmentedChoice<Gender>(
                        options: Gender.values,
                        value: _gender,
                        labelOf: (g) => g == Gender.male ? l10n.enumsGenderMale : l10n.enumsGenderFemale,
                        onChanged: (g) => setState(() => _gender = g),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AppTextField(
                        label: l10n.authRegisterPasswordLabel,
                        controller: _password,
                        onChanged: (_) => setState(() {}),
                        obscureText: true,
                        autofillHints: const [AutofillHints.newPassword],
                      ),
                      PasswordRequirements(password: _password.text),
                    ],
                  ),
                  AppTextField(
                    label: l10n.authRegisterConfirmPasswordLabel,
                    controller: _confirmPassword,
                    onChanged: (_) => setState(() {}),
                    obscureText: true,
                    autofillHints: const [AutofillHints.newPassword],
                  ),
                  InkWell(
                    onTap: () => setState(() => _agreed = !_agreed),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Checkbox(
                          value: _agreed,
                          onChanged: (value) => setState(() => _agreed = value ?? false),
                          visualDensity: VisualDensity.compact,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              l10n.authRegisterAgreeToTerms,
                              style: TextStyle(fontSize: 13, color: p.textMuted),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null) Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
                  AppButton(
                    label: _submitting ? l10n.authRegisterCreatingAccount : l10n.authRegisterCreateAccount,
                    loading: _submitting,
                    onPressed: canSubmit ? _submit : null,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(l10n.authRegisterAlreadyHaveAccount, style: TextStyle(color: p.textMuted)),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => context.go('/login'),
                    child: Text(
                      l10n.authRegisterSignIn,
                      style: TextStyle(fontWeight: FontWeight.w600, color: p.primary),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (checkingProfile) const Positioned.fill(child: LoadingView()),
      ],
    );
  }
}

class _OtpBlock extends StatelessWidget {
  const _OtpBlock({
    required this.otp,
    required this.busy,
    required this.emailTrimmed,
    required this.emailTaken,
    required this.codeController,
    required this.onCodeChanged,
    required this.onSend,
    required this.onVerify,
  });

  final EmailOtpState otp;
  final bool busy;
  final String emailTrimmed;
  final bool emailTaken;
  final TextEditingController codeController;
  final ValueChanged<String> onCodeChanged;
  final VoidCallback onSend;
  final VoidCallback onVerify;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    final sendLabel = otp.cooldown > 0
        ? l10n.authRegisterResendIn(otp.cooldown)
        : otp.status == EmailOtpStatus.sent
            ? l10n.authRegisterResendCode
            : l10n.authRegisterSendCode;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (otp.status == EmailOtpStatus.sent) ...[
          Text(
            l10n.authRegisterCodeSentHint(emailTrimmed),
            style: TextStyle(fontSize: 13, color: p.textMuted),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: AppTextField(
                  label: l10n.authRegisterCodeLabel,
                  controller: codeController,
                  onChanged: onCodeChanged,
                  keyboardType: TextInputType.number,
                  autofillHints: const [AutofillHints.oneTimeCode],
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              AppButton(
                label: l10n.authRegisterVerify,
                expand: false,
                loading: otp.pending,
                onPressed: busy || codeController.text.length != 6 ? null : onVerify,
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        AppButton(
          label: sendLabel,
          variant: AppButtonVariant.secondary,
          loading: otp.pending && otp.status == EmailOtpStatus.idle,
          onPressed: busy || emailTrimmed.isEmpty || emailTaken || otp.cooldown > 0 ? null : onSend,
        ),
      ],
    );
  }
}
