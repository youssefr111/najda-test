import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/app_palette.dart';

/// A message to show on top of whatever screen is open (a push that arrives while the app is in the foreground).
class InAppNotification {
  const InAppNotification({
    required this.id,
    required this.title,
    this.body,
    this.icon = Icons.notifications_none_rounded,
    this.urgent = false,
    this.onTap,
  });

  final int id;
  final String title;
  final String? body;
  final IconData icon;

  /// Drawn in the danger colour instead of the primary one (a mission offer, a new emergency).
  final bool urgent;

  /// What tapping it does. The banner closes either way.
  final VoidCallback? onTap;
}

/// Shows one in-app notification at a time; a newer one replaces the one on screen.
class InAppNotificationController extends Notifier<InAppNotification?> {
  int _lastId = 0;

  @override
  InAppNotification? build() => null;

  void show({
    required String title,
    String? body,
    IconData icon = Icons.notifications_none_rounded,
    bool urgent = false,
    VoidCallback? onTap,
  }) {
    state = InAppNotification(
      id: ++_lastId,
      title: title,
      body: body,
      icon: icon,
      urgent: urgent,
      onTap: onTap,
    );
  }

  /// Closes notification [id]; ignored when a newer one has already replaced it.
  void dismiss(int id) {
    if (state?.id == id) state = null;
  }
}

final inAppNotificationProvider =
    NotifierProvider<InAppNotificationController, InAppNotification?>(InAppNotificationController.new);

/// Floats the current in-app notification at the top of the app, like a phone's own heads-up notification.
///
/// It overlays the app instead of sitting above it, so nothing shifts when it appears, and it is click-through
/// when nothing is showing. Tap opens it; swipe it left or right to dismiss; otherwise it leaves on its own.
class InAppNotificationHost extends ConsumerWidget {
  const InAppNotificationHost({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final item = ref.watch(inAppNotificationProvider);

    return SafeArea(
      bottom: false,
      child: Align(
        alignment: Alignment.topCenter,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 280),
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          transitionBuilder: (child, animation) => FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween(begin: const Offset(0, -0.6), end: Offset.zero).animate(animation),
              child: child,
            ),
          ),
          child: item == null
              ? const SizedBox.shrink(key: ValueKey('no-notification'))
              : _NotificationCard(
                  key: ValueKey(item.id),
                  item: item,
                  onDismiss: () => ref.read(inAppNotificationProvider.notifier).dismiss(item.id),
                ),
        ),
      ),
    );
  }
}

class _NotificationCard extends StatefulWidget {
  const _NotificationCard({required this.item, required this.onDismiss, super.key});

  final InAppNotification item;
  final VoidCallback onDismiss;

  @override
  State<_NotificationCard> createState() => _NotificationCardState();
}

class _NotificationCardState extends State<_NotificationCard> with SingleTickerProviderStateMixin {
  static const _visibleFor = Duration(seconds: 6);

  /// Drives the card back to rest, or off the screen once it has been thrown away.
  late final AnimationController _settle = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 180),
  );

  Timer? _timer;
  double _dx = 0;
  double _from = 0;
  double _to = 0;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _settle
      ..addListener(_onSettleTick)
      ..addStatusListener(_onSettleStatus);
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _settle.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer(_visibleFor, widget.onDismiss);
  }

  void _onSettleTick() {
    setState(() => _dx = _from + (_to - _from) * Curves.easeOut.transform(_settle.value));
  }

  void _onSettleStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed && _leaving) widget.onDismiss();
  }

  void _animateTo(double target, {required bool leave}) {
    _leaving = leave;
    _from = _dx;
    _to = target;
    _settle.forward(from: 0);
  }

  // Held in the person's finger: stay on screen.
  void _onDragStart(DragStartDetails _) {
    _timer?.cancel();
    _settle.stop();
  }

  void _onDragUpdate(DragUpdateDetails details) => setState(() => _dx += details.delta.dx);

  void _onDragEnd(DragEndDetails details) {
    final width = context.size?.width ?? 320;
    final velocity = details.velocity.pixelsPerSecond.dx;
    final flung = velocity.abs() > 700;

    if (flung || _dx.abs() > width * 0.3) {
      final direction = (flung ? velocity : _dx) < 0 ? -1.0 : 1.0;
      _animateTo(direction * width * 1.2, leave: true);
    } else {
      _animateTo(0, leave: false);
      _startTimer();
    }
  }

  void _onTap() {
    _timer?.cancel();
    widget.item.onTap?.call();
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final item = widget.item;
    final accent = item.urgent ? p.danger : p.primary;
    final body = item.body;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: GestureDetector(
          onHorizontalDragStart: _onDragStart,
          onHorizontalDragUpdate: _onDragUpdate,
          onHorizontalDragEnd: _onDragEnd,
          child: Transform.translate(
            offset: Offset(_dx, 0),
            child: Opacity(
              opacity: (1 - _dx.abs() / 320).clamp(0.0, 1.0),
              child: Semantics(
                liveRegion: true,
                child: Material(
                  color: p.surface,
                  elevation: 8,
                  shadowColor: Colors.black45,
                  clipBehavior: Clip.antiAlias,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(color: accent.withValues(alpha: 0.35)),
                  ),
                  child: InkWell(
                    onTap: _onTap,
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), shape: BoxShape.circle),
                            child: Icon(item.icon, color: accent, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: p.text),
                                ),
                                if (body != null && body.isNotEmpty)
                                  Text(
                                    body,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontSize: 13, color: p.textMuted),
                                  ),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right_rounded, color: p.textMuted),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}