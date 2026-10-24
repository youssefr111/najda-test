import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/l10n_x.dart';
import '../router/app_router.dart';
import '../theme/app_palette.dart';
import 'backend_status.dart';

/// A small floating pill shown only while the backend is slow, degraded or
/// unreachable, or the phone is offline.
///
/// It overlays the app instead of sitting above it, so nothing shifts when it
/// appears or disappears. Tapping it opens the full system-status page.
/// Invisible (and click-through) when everything is fine.
class BackendStatusBanner extends ConsumerWidget {
  const BackendStatusBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final health = ref.watch(backendStatusProvider);
    final l10n = context.l10n;
    final p = context.palette;

    final (message, icon, color) = switch (health.status) {
      BackendStatus.waking => (
        l10n.statusBannerWaking,
        Icons.hourglass_top_rounded,
        p.warning,
      ),
      BackendStatus.degraded => (
        l10n.statusBannerDegraded,
        Icons.warning_amber_rounded,
        p.warning,
      ),
      BackendStatus.offline => (
        l10n.statusBannerOffline,
        Icons.cloud_off_rounded,
        p.danger,
      ),
      _ => (
        l10n.statusBannerUnreachable,
        Icons.error_outline_rounded,
        p.danger,
      ),
    };

    return SafeArea(
      bottom: false,
      child: Align(
        alignment: Alignment.topCenter,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          switchInCurve: Curves.easeOutCubic,
          transitionBuilder: (child, animation) => FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween(
                begin: const Offset(0, -0.8),
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          ),
          child: health.hasProblem
              ? Padding(
                  key: ValueKey(health.status),
                  padding: const EdgeInsets.only(top: 8, left: 16, right: 16),
                  child: Material(
                    color: p.surface,
                    elevation: 6,
                    shadowColor: Colors.black38,
                    shape: StadiumBorder(
                      side: BorderSide(color: color.withValues(alpha: 0.5)),
                    ),
                    child: InkWell(
                      customBorder: const StadiumBorder(),
                      onTap: () => ref.read(routerProvider).push('/status'),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 8,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(icon, size: 16, color: color),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                message,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: p.text,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
              : const SizedBox.shrink(key: ValueKey('healthy')),
        ),
      ),
    );
  }
}
