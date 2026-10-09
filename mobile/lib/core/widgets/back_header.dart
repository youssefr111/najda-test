import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_palette.dart';

/// In-page header with a back chevron that mirrors automatically under RTL.
class BackHeader extends StatelessWidget {
  const BackHeader({required this.title, super.key, this.fallbackLocation, this.trailing});

  final String title;

  /// Where to go if there is nothing to pop (deep link / cold start).
  final String? fallbackLocation;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          IconButton(
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else if (fallbackLocation != null) {
                context.go(fallbackLocation!);
              }
            },
            icon: Icon(Icons.arrow_back_ios_new, size: 20, color: p.text),
            style: IconButton.styleFrom(
              // Keeps the 48dp touch target but trims the visual footprint.
              visualDensity: VisualDensity.compact,
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: p.text),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
