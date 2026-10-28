import 'package:flutter/material.dart';

import '../../../../core/layout/responsive.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/app_logo.dart';
import '../../../../core/widgets/language_switcher.dart';
import '../../../../core/widgets/theme_switcher.dart';

/// Language + theme toggles, the logo and a one-line subtitle, shared by the
/// login and register screens. The logo shrinks on small / short screens so
/// the form stays reachable without scrolling past it.
class AuthHeader extends StatelessWidget {
  const AuthHeader({required this.subtitle, super.key});

  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final logoSize = context.adaptive<double>(compact: 72, regular: 104);

    return Column(
      children: [
        const Align(
          alignment: AlignmentDirectional.centerEnd,
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.end,
            children: [LanguageSwitcher(), ThemeSwitcher()],
          ),
        ),
        SizedBox(height: context.adaptive<double>(compact: 8, regular: 20)),
        AppLogo(size: logoSize),
        const SizedBox(height: 12),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 15,
            height: 1.4,
            color: context.palette.textMuted,
          ),
        ),
        SizedBox(height: context.adaptive<double>(compact: 16, regular: 28)),
      ],
    );
  }
}

/// Rounded panel that holds the auth forms.
class AuthPanel extends StatelessWidget {
  const AuthPanel({required this.children, super.key});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: EdgeInsets.all(
        context.adaptive<double>(compact: 16, regular: 24),
      ),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(height: 14),
            children[i],
          ],
        ],
      ),
    );
  }
}
