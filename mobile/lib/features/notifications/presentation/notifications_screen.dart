import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/push/notification_routes.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/states.dart';
import '../../auth/application/auth_controller.dart';
import '../application/notifications_providers.dart';
import '../data/notifications_repository.dart';
import '../domain/app_notification.dart';

/// The notification inbox: newest first, live (a new one appears without
/// pulling), paged, with read / unread state. Tapping one opens what it is about.
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  /// Older pages fetched with "load older"; the live first page is never duplicated here.
  final List<AppNotification> _older = [];
  int? _olderCursor;
  bool _hasMore = true;
  bool _loadingMore = false;

  /// Marked read on this screen before the server round trip finished.
  final Set<int> _locallyRead = {};
  bool _allRead = false;

  bool _isRead(AppNotification n) =>
      n.read || _allRead || _locallyRead.contains(n.id);

  Future<void> _loadMore(NotificationPage firstPage) async {
    setState(() => _loadingMore = true);
    try {
      final cursor = _olderCursor ?? firstPage.nextBefore;
      if (cursor == null) {
        setState(() => _hasMore = false);
        return;
      }
      final page = await ref
          .read(notificationsRepositoryProvider)
          .list(before: cursor);
      if (!mounted) return;
      setState(() {
        _older.addAll(page.items);
        _olderCursor = page.nextBefore;
        _hasMore = page.nextBefore != null;
      });
    } catch (_) {
      // The button stays: tapping it again retries.
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _markAllRead() async {
    setState(() => _allRead = true);
    await ref.read(notificationsRepositoryProvider).markAllRead();
    ref
      ..invalidate(notificationsPageProvider)
      ..invalidate(unreadNotificationsStreamProvider);
  }

  void _open(AppNotification n) {
    final user = ref.read(currentUserProvider);
    if (!_isRead(n)) {
      setState(() => _locallyRead.add(n.id));
      unawaited(
        ref
            .read(notificationsRepositoryProvider)
            .markRead(n.id)
            .then((_) {
              ref.invalidate(unreadNotificationsStreamProvider);
            })
            .catchError((Object _) {}),
      );
    }
    if (user != null) {
      context.push(
        notificationRoute(type: n.type, data: n.data, role: user.role),
      );
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _older.clear();
      _olderCursor = null;
      _hasMore = true;
      _locallyRead.clear();
      _allRead = false;
    });
    ref.invalidate(notificationsPageProvider);
    await ref.read(notificationsPageProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final page = ref.watch(notificationsPageProvider);

    return Scaffold(
      body: ScreenScaffold(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            BackHeader(title: l10n.notificationsTitle, fallbackLocation: '/'),
            Expanded(
              child: page.when(
                loading: () => LoadingView(label: l10n.commonLoading),
                error: (error, _) => ErrorView(
                  message: describeError(l10n, error),
                  retryLabel: l10n.commonRetry,
                  onRetry: () => ref.invalidate(notificationsPageProvider),
                ),
                data: (first) {
                  final seen = <int>{};
                  final items = [
                    for (final n in [...first.items, ..._older])
                      if (seen.add(n.id)) n,
                  ];
                  if (items.isEmpty) return _EmptyInbox(onRefresh: _refresh);

                  final unread = items.where((n) => !_isRead(n)).length;
                  final canLoadMore =
                      _hasMore &&
                      (_olderCursor != null || first.nextBefore != null);

                  return RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.only(bottom: 16),
                      itemCount: items.length + 1,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return Align(
                            alignment: AlignmentDirectional.centerEnd,
                            child: unread == 0
                                ? const SizedBox(height: 8)
                                : TextButton.icon(
                                    onPressed: _markAllRead,
                                    icon: const Icon(
                                      Icons.done_all_rounded,
                                      size: 18,
                                    ),
                                    label: Text(l10n.notificationsMarkAllRead),
                                  ),
                          );
                        }
                        final n = items[index - 1];
                        final isLast = index == items.length;
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _NotificationTile(
                              notification: n,
                              read: _isRead(n),
                              onTap: () => _open(n),
                            ),
                            if (isLast && canLoadMore) ...[
                              const SizedBox(height: 12),
                              AppButton(
                                label: l10n.notificationsLoadMore,
                                variant: AppButtonVariant.secondary,
                                loading: _loadingMore,
                                onPressed: () => _loadMore(first),
                              ),
                            ],
                          ],
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyInbox extends StatelessWidget {
  const _EmptyInbox({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 80),
          Center(
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                color: p.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.notifications_none_rounded,
                size: 40,
                color: p.primary,
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            l10n.notificationsEmptyTitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              l10n.notificationsEmptyBody,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, height: 1.45, color: p.textMuted),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.read,
    required this.onTap,
  });

  final AppNotification notification;
  final bool read;
  final VoidCallback onTap;

  static IconData _icon(String type) => switch (type) {
    'MISSION_OFFERED' || 'MISSION_CANCELLED' => Icons.assignment_outlined,
    'INCIDENT_NEW' || 'INCIDENT_CANCELLED_BY_CITIZEN' => Icons.crisis_alert,
    'MISSION_REJECTED' ||
    'MISSION_WITHDRAWN' => Icons.report_gmailerrorred_outlined,
    'INCIDENT_ACCEPTED' || 'INCIDENT_EN_ROUTE' => Icons.directions_car_outlined,
    'INCIDENT_ARRIVED' => Icons.flag_outlined,
    'INCIDENT_RESOLVED' => Icons.check_circle_outline,
    'INCIDENT_CLOSED_FALSE_REPORT' ||
    'INCIDENT_CLOSED_DUPLICATE' => Icons.inventory_2_outlined,
    'CHAT_MESSAGE' => Icons.chat_bubble_outline,
    'APPLICATION_APPROVED' ||
    'APPLICATION_REJECTED' ||
    'APPLICATION_SUBMITTED' => Icons.badge_outlined,
    'PATIENT_INCOMING' => Icons.local_hospital_outlined,
    'LEGAL_UPDATED' => Icons.gavel_outlined,
    _ => Icons.notifications_none_rounded,
  };

  String _when(BuildContext context) {
    final locale = Localizations.localeOf(context).toString();
    final created = notification.createdAt;
    final now = DateTime.now();
    final sameDay =
        created.year == now.year &&
        created.month == now.month &&
        created.day == now.day;
    return sameDay
        ? DateFormat.jm(locale).format(created)
        : DateFormat.MMMd(locale).add_jm().format(created);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final language = Localizations.localeOf(context).languageCode;

    return Material(
      color: read ? p.surface : p.primary.withValues(alpha: 0.06),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: read ? p.border : p.primary.withValues(alpha: 0.3),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: p.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _icon(notification.type),
                  size: 20,
                  color: p.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.titleFor(language),
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: read
                                  ? FontWeight.w600
                                  : FontWeight.w800,
                              color: p.text,
                            ),
                          ),
                        ),
                        if (!read)
                          Container(
                            width: 9,
                            height: 9,
                            margin: const EdgeInsetsDirectional.only(start: 8),
                            decoration: BoxDecoration(
                              color: p.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      notification.bodyFor(language),
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        color: p.textMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _when(context),
                      style: TextStyle(fontSize: 11, color: p.textSubtle),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
