import 'package:flutter/material.dart';

import '../theme/app_palette.dart';

/// One tab of an [AppTabBar].
class AppTab<T> {
  const AppTab({required this.id, required this.label, required this.icon});

  final T id;
  final String label;
  final IconData icon;
}

/// Pill-style segmented tabs (mirrors the web account page's tab strip).
/// Stateless: the parent owns the selected tab and decides how panels keep
/// their state, so a half-filled form survives switching tabs.
class AppTabBar<T> extends StatelessWidget {
  const AppTabBar({
    required this.tabs,
    required this.value,
    required this.onChanged,
    super.key,
    this.semanticLabel,
  });

  final List<AppTab<T>> tabs;
  final T value;
  final ValueChanged<T> onChanged;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;

    return Semantics(
      container: true,
      label: semanticLabel,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: p.surfaceAlt,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          children: [
            for (final tab in tabs)
              Expanded(
                child: _TabButton(
                  tab: tab,
                  selected: tab.id == value,
                  onTap: () => onChanged(tab.id),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TabButton<T> extends StatelessWidget {
  const _TabButton({
    required this.tab,
    required this.selected,
    required this.onTap,
  });

  final AppTab<T> tab;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = selected ? p.primary : p.textMuted;

    return Semantics(
      button: true,
      selected: selected,
      child: Material(
        color: selected ? p.surface : Colors.transparent,
        shape: const StadiumBorder(),
        elevation: selected ? 1 : 0,
        shadowColor: Colors.black26,
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(tab.icon, size: 18, color: color),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    tab.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
