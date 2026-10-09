import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/l10n_x.dart';

enum ShellKind { citizen, responder }

/// Bottom navigation around a [StatefulShellRoute]. Each tab keeps its own
/// navigation stack and scroll position. Labels are resolved here (not in the
/// route table) so they update the moment the language changes.
class AppShell extends StatelessWidget {
  const AppShell({required this.shell, required this.kind, super.key});

  final StatefulNavigationShell shell;
  final ShellKind kind;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final items = switch (kind) {
      ShellKind.citizen => [
          (Icons.campaign_outlined, Icons.campaign, l10n.navReport),
          (Icons.person_outline, Icons.person, l10n.navAccount),
        ],
      ShellKind.responder => [
          (Icons.assignment_outlined, Icons.assignment, l10n.navMissions),
          (Icons.schedule_outlined, Icons.schedule, l10n.navShift),
          (Icons.person_outline, Icons.person, l10n.navAccount),
        ],
    };

    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (index) => shell.goBranch(
          index,
          // Tapping the active tab returns to its root.
          initialLocation: index == shell.currentIndex,
        ),
        destinations: [
          for (final (icon, selectedIcon, label) in items)
            NavigationDestination(icon: Icon(icon), selectedIcon: Icon(selectedIcon), label: label),
        ],
      ),
    );
  }
}
