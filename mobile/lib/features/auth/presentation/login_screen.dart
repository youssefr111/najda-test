import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
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
  final _email = TextEditingController();
  final _password = TextEditingController();

  _LoginMode _mode = _LoginMode.signIn;
  String? _error;
  bool _loading = false;
  bool _resetSent = false;

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
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await ref.read(authRepositoryProvider).signInWithEmail(_email.text, _password.text);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendResetLink() async {
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
      await ref.read(authRepositoryProvider).deleteCurrentUserQuietly();
      if (mounted) setState(() => _error = context.l10n.authLoginNoAccountFoundGoogle);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final checkingProfile = ref.watch(authControllerProvider) is AuthCheckingProfile;
    final signingIn = _mode == _LoginMode.signIn;

    return Stack(
      children: [
        ScreenScaffold(
          scroll: true,
          centered: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AuthHeader(subtitle: signingIn ? l10n.authLoginSubtitle : l10n.authLoginResetSubtitle),
              AuthPanel(
                children: [
                  if (signingIn) ...[
                    GoogleSignInButton(
                      label: l10n.authLoginContinueWithGoogle,
                      onSignedIn: _onGoogleSignedIn,
                      onError: (error) {
                        if (mounted) setState(() => _error = describeError(l10n, error));
                      },
                    ),
                    OrDivider(label: l10n.authLoginOr),
                    AppTextField(
                      label: l10n.authLoginEmailLabel,
                      controller: _email,
                      onChanged: (_) => setState(() {}),
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppTextField(
                          label: l10n.authLoginPasswordLabel,
                          controller: _password,
                          onChanged: (_) => setState(() {}),
                          obscureText: true,
                          autofillHints: const [AutofillHints.password],
                        ),
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: () => _switchMode(_LoginMode.forgotPassword),
                          child: Text(
                            l10n.authLoginForgotPassword,
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: p.primary, decoration: TextDecoration.none),
                          ),
                        ),
                      ],
                    ),
                    if (_error != null)
                      Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
                    AppButton(
                      label: _loading ? l10n.authLoginSigningIn : l10n.authLoginSignIn,
                      loading: _loading,
                      onPressed: _email.text.isEmpty || _password.text.isEmpty ? null : _signIn,
                    ),
                  ] else ...[
                    if (_resetSent)
                      Text.rich(
                        TextSpan(
                          style: TextStyle(fontSize: 14, color: p.textMuted),
                          children: [
                            TextSpan(text: '${l10n.authLoginResetSentBefore} '),
                            TextSpan(
                              text: _email.text.trim(),
                              style: TextStyle(fontWeight: FontWeight.w500, color: p.text),
                            ),
                            TextSpan(text: ' ${l10n.authLoginResetSentAfter}'),
                          ],
                        ),
                      )
                    else ...[
                      AppTextField(
                        label: l10n.authLoginEmailLabel,
                        controller: _email,
                        onChanged: (_) => setState(() {}),
                        keyboardType: TextInputType.emailAddress,
                      ),
                      if (_error != null)
                        Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
                      AppButton(
                        label: _loading ? l10n.authLoginSending : l10n.authLoginSendResetLink,
                        loading: _loading,
                        onPressed: _email.text.isEmpty ? null : _sendResetLink,
                      ),
                    ],
                    AppButton(
                      label: l10n.authLoginBackToSignIn,
                      variant: AppButtonVariant.ghost,
                      onPressed: () => _switchMode(_LoginMode.signIn),
                    ),
                  ],
                ],
              ),
              if (signingIn) ...[
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
                    GestureDetector(
                      onTap: () => context.go('/register'),
                      child: Text(
                        l10n.authLoginCreateAccount,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: p.primary),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 32),
              const Center(child: AppVersionLabel()),
            ],
          ),
        ),
        if (checkingProfile) const Positioned.fill(child: LoadingView()),
      ],
    );
  }
}