import 'package:flutter/material.dart';

import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/language_switcher.dart';
import '../../../../core/widgets/theme_switcher.dart';

/// Language + theme toggles, logo and subtitle shared by login and register.
class AuthHeader extends StatelessWidget {
  const AuthHeader({required this.subtitle, super.key});

  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Align(
          alignment: AlignmentDirectional.centerEnd,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [LanguageSwitcher(), SizedBox(width: 8), ThemeSwitcher()],
          ),
        ),
        const SizedBox(height: 16),
        Image.asset('assets/images/logo-stacked.png', height: 64, width: 64),
        const SizedBox(height: 12),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 15, color: context.palette.textMuted, decoration: TextDecoration.none),
        ),
        const SizedBox(height: 28),
      ],
    );
  }
}

/// White rounded panel that holds the auth forms.
class AuthPanel extends StatelessWidget {
  const AuthPanel({required this.children, super.key});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            children[i],
          ],
        ],
      ),
    );
  }
}
