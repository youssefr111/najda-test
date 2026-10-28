import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/google_logo.dart';
import '../../data/auth_repository.dart';

/// "Continue with Google". Deliberately a neutral pill with the full-colour
/// Google mark (Google's branding rules forbid recolouring it), so it stays
/// clearly distinct from the brand-red primary action beside it.
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
      final credential = await ref
          .read(authRepositoryProvider)
          .signInWithGoogle();
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final enabled = widget.enabled && !_loading;

    return Opacity(
      opacity: widget.enabled ? 1 : 0.5,
      child: OutlinedButton(
        onPressed: enabled ? _handlePress : null,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          backgroundColor: isDark ? p.surfaceAlt : Colors.white,
          foregroundColor: p.text,
          side: BorderSide(color: p.border),
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        child: _loading
            ? SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: p.text),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const GoogleLogo(size: 20),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      widget.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// "—— or ——" divider used between Google and the e-mail form.
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
            label,
            style: TextStyle(fontSize: 13, color: p.textSubtle),
          ),
        ),
        Expanded(child: Divider(color: p.border)),
      ],
    );
  }
}
