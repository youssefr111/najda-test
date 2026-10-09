import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/locale_controller.dart';
import '../theme/app_palette.dart';

/// Compact language toggle. [compact] shows only the other language's name.
class LanguageSwitcher extends ConsumerWidget {
  const LanguageSwitcher({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final current = ref.watch(localeControllerProvider);

    return Material( // <-- Added Material wrapper to satisfy InkWell
      color: Colors.transparent,
      child: PopupMenuButton<Locale>(
        tooltip: '',
        color: p.surface,
        onSelected: (locale) => ref.read(localeControllerProvider.notifier).setLocale(locale),
        itemBuilder: (context) => [
          for (final language in supportedLanguages)
            CheckedPopupMenuItem<Locale>(
              value: language.locale,
              checked: language.locale == current,
              child: Text(language.name),
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
              Icon(Icons.language, size: 16, color: p.textMuted),
              const SizedBox(width: 6),
              Text(
                supportedLanguages.firstWhere((l) => l.locale == current).name,
                style: TextStyle(fontSize: 13, color: p.text),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
