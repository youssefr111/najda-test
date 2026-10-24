import 'package:flutter/widgets.dart';

/// Layout helpers so every screen adapts to small phones, large phones and
/// tablets from one place instead of scattering magic numbers.
abstract final class Breakpoints {
  /// Narrow phones (iPhone SE / small Androids).
  static const double compactWidth = 360;

  /// Short viewports: landscape phones, or portrait with the keyboard open.
  static const double shortHeight = 640;

  /// Tablets and foldables.
  static const double tabletShortestSide = 600;

  /// Content never stretches wider than this; it is centered instead.
  static const double contentMaxWidth = 600;
}

extension ResponsiveContext on BuildContext {
  Size get screenSize => MediaQuery.sizeOf(this);

  bool get isCompactWidth => screenSize.width < Breakpoints.compactWidth;
  bool get isShortScreen => screenSize.height < Breakpoints.shortHeight;
  bool get isTablet =>
      screenSize.shortestSide >= Breakpoints.tabletShortestSide;

  /// Standard horizontal/vertical page padding for the current width.
  double get pagePadding {
    if (isTablet) return 24;
    if (isCompactWidth) return 12;
    return 16;
  }

  /// Picks a value by screen class, e.g. `context.adaptive(compact: 72, regular: 104)`.
  T adaptive<T>({required T compact, required T regular, T? tablet}) {
    if (isTablet) return tablet ?? regular;
    if (isCompactWidth || isShortScreen) return compact;
    return regular;
  }
}
