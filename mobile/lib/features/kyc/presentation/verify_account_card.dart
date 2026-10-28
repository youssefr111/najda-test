import 'package:flutter/material.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';

/// One requirement in the "verify your account first" list.
class VerificationRequirement {
  const VerificationRequirement({required this.label, required this.done});

  final String label;
  final bool done;
}

/// "Verify your account first": what is still missing, with a button to the Account page where each step is done.
/// Shared by the responder application and the report gate so both look and read the same.
class VerifyAccountCard extends StatelessWidget {
  const VerifyAccountCard({
    required this.body,
    required this.requirements,
    required this.onGoToAccount,
    super.key,
  });

  final String body;
  final List<VerificationRequirement> requirements;
  final VoidCallback onGoToAccount;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.becomeResponderPageVerifyFirstTitle,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: p.text),
          ),
          const SizedBox(height: 8),
          Text(body, style: TextStyle(fontSize: 14, color: p.textMuted)),
          const SizedBox(height: 14),
          for (final requirement in requirements) ...[
            _RequirementTile(requirement: requirement),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 8),
          AppButton(label: l10n.becomeResponderPageGoToAccount, onPressed: onGoToAccount),
        ],
      ),
    );
  }
}

class _RequirementTile extends StatelessWidget {
  const _RequirementTile({required this.requirement});

  final VerificationRequirement requirement;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final done = requirement.done;
    final color = done ? p.success : p.warning;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          Icon(done ? Icons.check_circle : Icons.cancel, size: 20, color: color),
          const SizedBox(width: 10),
          Expanded(child: Text(requirement.label, style: TextStyle(fontSize: 14, color: p.text))),
          Text(
            done ? l10n.becomeResponderPageVerified : l10n.becomeResponderPageNotVerified,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}