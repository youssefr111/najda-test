import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/utils/validators.dart';

/// Live checklist of the password rules. Hidden until the user types.
class PasswordRequirements extends StatelessWidget {
  const PasswordRequirements({required this.password, super.key});

  final String password;

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();

    final p = context.palette;
    final l10n = context.l10n;

    String label(PasswordRule rule) => switch (rule) {
          PasswordRule.length => l10n.authPasswordRulesLength,
          PasswordRule.uppercase => l10n.authPasswordRulesUppercase,
          PasswordRule.lowercase => l10n.authPasswordRulesLowercase,
          PasswordRule.number => l10n.authPasswordRulesNumber,
        };

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final rule in PasswordRule.values)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  Icon(
                    rule.test(password) ? Icons.check : Icons.close,
                    size: 14,
                    color: rule.test(password) ? AppColors.emerald600 : p.textSubtle,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    label(rule),
                    style: TextStyle(
                      fontSize: 12,
                      color: rule.test(password) ? AppColors.emerald600 : p.textSubtle,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
