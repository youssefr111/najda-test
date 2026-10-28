import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/storage/preferences.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/app_version_label.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/states.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';
import '../domain/auth_state.dart';
import 'widgets/auth_header.dart';
import 'widgets/google_sign_in_button.dart';

enum _LoginMode { signIn, forgotPassword }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  late final TextEditingController _email = TextEditingController(
    text:
        ref.read(sharedPreferencesProvider).getString(PrefKeys.lastEmail) ?? '',
  );
  final _password = TextEditingController();

  _LoginMode _mode = _LoginMode.signIn;
  String? _error;
  bool _loading = false;
  bool _resetSent = false;

  bool get _signingIn => _mode == _LoginMode.signIn;
  bool get _canSignIn =>
      isValidEmailFormat(_email.text.trim()) && _password.text.isNotEmpty;
  bool get _canSendReset => isValidEmailFormat(_email.text.trim());

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _switchMode(_LoginMode mode) => setState(() {
    _mode = mode;
    _error = null;
    _resetSent = false;
  });

  Future<void> _signIn() async {
    if (!_canSignIn || _loading) return;
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final email = _email.text.trim();
      await ref
          .read(authRepositoryProvider)
          .signInWithEmail(email, _password.text);
      // Remember the address, and tell the OS the form succeeded so Android /
      // iOS offer to save (and later autofill) the credentials.
      await ref
          .read(sharedPreferencesProvider)
          .setString(PrefKeys.lastEmail, email);
      TextInput.finishAutofillContext();
    } catch (error) {
      TextInput.finishAutofillContext(shouldSave: false);
      if (mounted) setState(() => _error = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendResetLink() async {
    if (!_canSendReset || _loading) return;
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await ref.read(authRepositoryProvider).sendPasswordReset(_email.text);
      if (mounted) setState(() => _resetSent = true);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onGoogleSignedIn(UserCredential credential) async {
    if (credential.additionalUserInfo?.isNewUser ?? false) {
      // Signing in must never create an account: undo the Firebase user.
      await ref.read(authRepositoryProvider).deleteCurrentUserQuietly();
      if (mounted) {
        setState(() => _error = context.l10n.authLoginNoAccountFoundGoogle);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final checkingProfile =
        ref.watch(authControllerProvider) is AuthCheckingProfile;

    return Stack(
      children: [
        ScreenScaffold(
          scroll: true,
          centered: true,
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AuthHeader(
                  subtitle: _signingIn
                      ? l10n.authLoginSubtitle
                      : l10n.authLoginResetSubtitle,
                ),
                AuthPanel(
                  children: _signingIn
                      ? _signInForm(context)
                      : _resetForm(context),
                ),
                if (_signingIn) ...[
                  const SizedBox(height: 24),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 6,
                    children: [
                      Text(
                        l10n.authLoginNoAccount,
                        style: TextStyle(fontSize: 14, color: p.textMuted),
                      ),
                      InkWell(
                        borderRadius: BorderRadius.circular(8),
                        onTap: () => context.push('/register'),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: 8,
                            horizontal: 4,
                          ),
                          child: Text(
                            l10n.authLoginCreateAccount,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: p.primary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 24),
                const AppVersionLabel(),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
        if (checkingProfile) const Positioned.fill(child: LoadingView()),
      ],
    );
  }

  List<Widget> _signInForm(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return [
      GoogleSignInButton(
        label: l10n.authLoginContinueWithGoogle,
        enabled: !_loading,
        onSignedIn: _onGoogleSignedIn,
        onError: (error) {
          if (mounted) setState(() => _error = describeError(l10n, error));
        },
      ),
      OrDivider(label: l10n.authLoginOr),
      AppTextField(
        label: l10n.authLoginEmailLabel,
        controller: _email,
        prefixIcon: Icons.mail_outline,
        onChanged: (_) => setState(() {}),
        keyboardType: TextInputType.emailAddress,
        textInputAction: TextInputAction.next,
        autofillHints: const [AutofillHints.username, AutofillHints.email],
      ),
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppTextField(
            label: l10n.authLoginPasswordLabel,
            controller: _password,
            prefixIcon: Icons.lock_outline,
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _signIn(),
            obscureText: true,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
          ),
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: TextButton(
              onPressed: () => _switchMode(_LoginMode.forgotPassword),
              child: Text(
                l10n.authLoginForgotPassword,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
      if (_error != null)
        Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
      AppButton(
        label: _loading ? l10n.authLoginSigningIn : l10n.authLoginSignIn,
        loading: _loading,
        onPressed: _canSignIn ? _signIn : null,
      ),
    ];
  }

  List<Widget> _resetForm(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return [
      if (_resetSent)
        Text.rich(
          TextSpan(
            style: TextStyle(fontSize: 14, height: 1.4, color: p.textMuted),
            children: [
              TextSpan(text: '${l10n.authLoginResetSentBefore} '),
              TextSpan(
                text: _email.text.trim(),
                style: TextStyle(fontWeight: FontWeight.w600, color: p.text),
              ),
              TextSpan(text: ' ${l10n.authLoginResetSentAfter}'),
            ],
          ),
        )
      else ...[
        AppTextField(
          label: l10n.authLoginEmailLabel,
          controller: _email,
          prefixIcon: Icons.mail_outline,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => _sendResetLink(),
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.email],
        ),
        if (_error != null)
          Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
        AppButton(
          label: _loading ? l10n.authLoginSending : l10n.authLoginSendResetLink,
          loading: _loading,
          onPressed: _canSendReset ? _sendResetLink : null,
        ),
      ],
      AppButton(
        label: l10n.authLoginBackToSignIn,
        variant: AppButtonVariant.ghost,
        onPressed: () => _switchMode(_LoginMode.signIn),
      ),
    ];
  }
}
