import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/l10n_x.dart';
import '../l10n/theme_mode_controller.dart';
import '../theme/app_palette.dart';

class ThemeSwitcher extends ConsumerWidget {
  const ThemeSwitcher({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final mode = ref.watch(themeModeControllerProvider);

    String label(ThemeMode m) => switch (m) {
          ThemeMode.system => l10n.accountThemeSystem,
          ThemeMode.light => l10n.accountThemeLight,
          ThemeMode.dark => l10n.accountThemeDark,
        };

    IconData icon(ThemeMode m) => switch (m) {
          ThemeMode.system => Icons.brightness_auto_outlined,
          ThemeMode.light => Icons.light_mode_outlined,
          ThemeMode.dark => Icons.dark_mode_outlined,
        };

    return Material( // <-- Added Material wrapper to satisfy InkWell
      color: Colors.transparent,
      child: PopupMenuButton<ThemeMode>(
        tooltip: '',
        color: p.surface,
        onSelected: (value) => ref.read(themeModeControllerProvider.notifier).setThemeMode(value),
        itemBuilder: (context) => [
          for (final value in ThemeMode.values)
            CheckedPopupMenuItem<ThemeMode>(
              value: value,
              checked: value == mode,
              child: Text(label(value)),
            ),
        ],
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            border: Border.all(color: p.border),
            borderRadius: BorderRadius.circular(999),
            color: p.surface,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon(mode), size: 16, color: p.textMuted),
              const SizedBox(width: 6),
              Text(label(mode), style: TextStyle(fontSize: 13, color: p.text)),
            ],
          ),
        ),
      ),
    );
  }
}