import 'package:flutter/material.dart';

/// Which NAJDA artwork to show.
enum AppLogoVariant {
  /// The mark alone -- compact headers and avatars.
  icon,

  /// The mark with the NAJDA wordmark -- auth screens and about pages.
  stacked,

  /// White mark + wordmark for use on the brand-red background (splash).
  stackedOnBrand,
}

/// The NAJDA logo, picking the artwork that stays legible in the current
/// theme (the red artwork is swapped for a white one on dark surfaces).
class AppLogo extends StatelessWidget {
  const AppLogo({
    super.key,
    this.variant = AppLogoVariant.stacked,
    this.size = 96,
  });

  final AppLogoVariant variant;
  final double size;

  static const _icon = 'assets/images/logo-icon.png';
  static const _stacked = 'assets/images/logo-stacked.png';
  static const _stackedWhite = 'assets/images/logo-stacked-white.png';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final Widget image = switch (variant) {
      AppLogoVariant.stackedOnBrand => Image.asset(
        _stackedWhite,
        fit: BoxFit.contain,
      ),
      AppLogoVariant.stacked => Image.asset(
        isDark ? _stackedWhite : _stacked,
        fit: BoxFit.contain,
      ),
      AppLogoVariant.icon =>
        isDark
            ? ColorFiltered(
                colorFilter: const ColorFilter.mode(
                  Colors.white,
                  BlendMode.srcIn,
                ),
                child: Image.asset(_icon, fit: BoxFit.contain),
              )
            : Image.asset(_icon, fit: BoxFit.contain),
    };

    return Semantics(
      label: 'NAJDA',
      image: true,
      child: ExcludeSemantics(
        child: SizedBox.square(dimension: size, child: image),
      ),
    );
  }
}
