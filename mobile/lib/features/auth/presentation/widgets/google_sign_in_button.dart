import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../data/auth_repository.dart';

class GoogleSignInButton extends ConsumerStatefulWidget {
  const GoogleSignInButton({
    required this.label,
    required this.onSignedIn,
    required this.onError,
    super.key,
    this.enabled = true,
  });

  final String label;
  final bool enabled;
  final Future<void> Function(UserCredential credential) onSignedIn;
  final void Function(Object error) onError;

  @override
  ConsumerState<GoogleSignInButton> createState() => _GoogleSignInButtonState();
}

class _GoogleSignInButtonState extends ConsumerState<GoogleSignInButton> {
  bool _loading = false;

  Future<void> _handlePress() async {
    setState(() => _loading = true);
    try {
      final credential = await ref.read(authRepositoryProvider).signInWithGoogle();
      // Cancelling the account chooser is not an error.
      if (credential != null) await widget.onSignedIn(credential);
    } catch (error) {
      widget.onError(error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final enabled = widget.enabled && !_loading;

    return Opacity(
      opacity: widget.enabled ? 1 : 0.5,
      child: OutlinedButton(
        onPressed: enabled ? _handlePress : null,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          backgroundColor: p.surface,
          foregroundColor: p.text,
          side: BorderSide(color: p.border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: _loading
            ? SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: p.text),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'G',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF4285F4)),
                  ),
                  const SizedBox(width: 10),
                  Text(widget.label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                ],
              ),
      ),
    );
  }
}

/// "—— or ——" divider used between Google and email forms.
class OrDivider extends StatelessWidget {
  const OrDivider({required this.label, super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        Expanded(child: Divider(color: p.border)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            label.toUpperCase(),
            style: TextStyle(fontSize: 12, letterSpacing: 0.6, color: p.textSubtle),
          ),
        ),
        Expanded(child: Divider(color: p.border)),
      ],
    );
  }
}

extension AuthL10n on BuildContext {
  /// Shared copy for "sign in with Google" across login and register.
  String get continueWithGoogle => l10n.authLoginContinueWithGoogle;
}
