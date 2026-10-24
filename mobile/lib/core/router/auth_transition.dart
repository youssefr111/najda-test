import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Page transitions for the sign-in <-> create-account swipe.
///
/// Register is *pushed* over login, so the two pages move together: register
/// slides in from the trailing edge while login drifts away slightly, and the
/// whole thing reverses on back / "Sign in". Direction flips under RTL.
abstract final class AuthTransitions {
  static const _duration = Duration(milliseconds: 320);

  /// The base page: fades in (cold start, after sign-out) and gives way to
  /// whatever is pushed on top of it.
  static CustomTransitionPage<void> base(GoRouterState state, Widget child) {
    return CustomTransitionPage<void>(
      key: state.pageKey,
      child: child,
      transitionDuration: _duration,
      reverseTransitionDuration: _duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final sign = _sign(context);
        final out = CurvedAnimation(
          parent: secondaryAnimation,
          curve: Curves.easeOutCubic,
        );
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween(
              begin: Offset.zero,
              end: Offset(-0.25 * sign, 0),
            ).animate(out),
            child: child,
          ),
        );
      },
    );
  }

  /// The page pushed on top: slides in from the trailing edge.
  static CustomTransitionPage<void> push(GoRouterState state, Widget child) {
    return CustomTransitionPage<void>(
      key: state.pageKey,
      child: child,
      transitionDuration: _duration,
      reverseTransitionDuration: _duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final sign = _sign(context);
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        );
        return SlideTransition(
          position: Tween(
            begin: Offset(sign, 0),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        );
      },
    );
  }

  static double _sign(BuildContext context) =>
      Directionality.of(context) == TextDirection.rtl ? -1 : 1;
}
