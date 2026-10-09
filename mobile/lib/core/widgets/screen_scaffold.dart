import 'package:flutter/material.dart';

import '../theme/app_palette.dart';

/// Standard page frame: safe area, consistent padding, optional scrolling and
/// pull-to-refresh. Every screen goes through this so spacing stays uniform.
class ScreenScaffold extends StatelessWidget {
  const ScreenScaffold({
    required this.child,
    super.key,
    this.scroll = false,
    this.padded = true,
    this.centered = false,
    this.onRefresh,
  });

  final Widget child;
  final bool scroll;
  final bool padded;

  /// Vertically centers short content (auth screens).
  final bool centered;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final padding = padded ? const EdgeInsets.all(16) : EdgeInsets.zero;
    Widget body = child;

    if (scroll) {
      body = LayoutBuilder(
        builder: (context, constraints) => SingleChildScrollView(
          physics: onRefresh != null ? const AlwaysScrollableScrollPhysics() : null,
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: padding,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: centered ? constraints.maxHeight - padding.vertical : 0,
            ),
            child: centered ? Center(child: child) : child,
          ),
        ),
      );
    } else {
      body = Padding(padding: padding, child: child);
    }

    if (onRefresh != null) {
      body = RefreshIndicator(onRefresh: onRefresh!, child: body);
    }

    return ColoredBox(
      color: context.palette.background,
      child: SafeArea(child: body),
    );
  }
}
