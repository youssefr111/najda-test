import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/app_logo.dart';
import '../../../auth/application/auth_controller.dart';
import '../../../notifications/application/notifications_providers.dart';

/// Greeting row shared by the citizen and responder home screens: brand mark,
/// time-aware greeting, the user's name and the notification bell.
class HomeHeader extends ConsumerWidget {
  const HomeHeader({super.key, this.subtitle});

  /// Optional line under the name (the responder's role, for example).
  final String? subtitle;

  String _greeting(BuildContext context) {
    final l10n = context.l10n;
    final hour = DateTime.now().hour;
    if (hour < 12) return l10n.goodMorning;
    if (hour < 18) return l10n.goodAfternoon;
    return l10n.goodEvening;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final user = ref.watch(currentUserProvider);
    final hasUnread = ref.watch(unreadNotificationCountProvider) > 0;

    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: p.surface,
            shape: BoxShape.circle,
            border: Border.all(color: p.border),
          ),
          child: const AppLogo(variant: AppLogoVariant.icon, size: 32),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _greeting(context),
                style: TextStyle(fontSize: 13, color: p.textMuted),
              ),
              Text(
                user?.fullName ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: p.textSubtle),
                ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        _BellButton(
          hasUnread: hasUnread,
          onPressed: () => context.push('/notifications'),
        ),
      ],
    );
  }
}

class _BellButton extends StatelessWidget {
  const _BellButton({required this.hasUnread, required this.onPressed});

  final bool hasUnread;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton.filledTonal(
          onPressed: onPressed,
          tooltip: context.l10n.notificationsTitle,
          icon: const Icon(Icons.notifications_none_rounded),
          style: IconButton.styleFrom(
            minimumSize: const Size(48, 48),
            backgroundColor: p.primary.withValues(alpha: 0.1),
            foregroundColor: p.text,
          ),
        ),
        if (hasUnread)
          PositionedDirectional(
            top: 11,
            end: 12,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: p.primary,
                shape: BoxShape.circle,
                border: Border.all(color: p.background, width: 1.5),
              ),
            ),
          ),
      ],
    );
  }
}
