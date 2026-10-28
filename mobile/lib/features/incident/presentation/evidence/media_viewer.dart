import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../application/media_providers.dart';
import '../../domain/incident_media.dart';

/// Where a viewed file lives.
sealed class MediaSource {
  const MediaSource();
}

/// Already uploaded: fetched through a short-lived signed link.
final class RemoteMedia extends MediaSource {
  const RemoteMedia(this.mediaId);

  final int mediaId;
}

/// Captured on this device and not uploaded yet.
final class LocalMedia extends MediaSource {
  const LocalMedia(this.path, {this.duration});

  final String path;

  /// Known length of a recording, shown before the player has loaded it.
  final Duration? duration;
}

/// Opens a full-screen viewer: pinch / double-tap zoom for photos, a scrubbable
/// player for videos, and play / seek / replay for voice recordings.
Future<void> showMediaViewer(
  BuildContext context, {
  required MediaKind kind,
  required MediaSource source,
}) => showDialog<void>(
  context: context,
  useSafeArea: false,
  builder: (_) => _MediaViewerDialog(kind: kind, source: source),
);

String _clock(Duration d) {
  final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  return d.inHours > 0 ? '${d.inHours}:$minutes:$seconds' : '$minutes:$seconds';
}

/// A file or URL ready to hand to a player.
typedef _Playable = ({String? url, String? path, Duration? duration});

class _MediaViewerDialog extends ConsumerWidget {
  const _MediaViewerDialog({required this.kind, required this.source});

  final MediaKind kind;
  final MediaSource source;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;

    final title = switch (kind) {
      MediaKind.photo => l10n.mediaViewerPhoto,
      MediaKind.video => l10n.mediaViewerVideo,
      _ => l10n.mediaViewerAudio,
    };

    final AsyncValue<_Playable> playable = switch (source) {
      LocalMedia(:final path, :final duration) => AsyncData((
        url: null,
        path: path,
        duration: duration,
      )),
      RemoteMedia(:final mediaId) =>
        ref
            .watch(mediaDownloadUrlProvider(mediaId))
            .whenData((url) => (url: url, path: null, duration: null)),
    };

    Widget message(String text) => Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white70),
        ),
      ),
    );

    return Dialog.fullscreen(
      backgroundColor: Colors.black,
      child: Material(
        color: Colors.black,
        child: SafeArea(
          child: Stack(
            children: [
              Positioned.fill(
                child: playable.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                  error: (_, _) => message(l10n.mediaGalleryLoadError),
                  data: (item) => switch (kind) {
                    MediaKind.photo => _PhotoViewer(
                      image: item.url != null
                          ? NetworkImage(item.url!)
                          : FileImage(File(item.path!)) as ImageProvider,
                    ),
                    MediaKind.video => _VideoViewer(
                      url: item.url,
                      path: item.path,
                    ),
                    _ => _AudioViewer(
                      url: item.url,
                      path: item.path,
                      knownDuration: item.duration,
                    ),
                  },
                ),
              ),
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: DecoratedBox(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.black87, Colors.transparent],
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        tooltip: l10n.mediaGalleryClose,
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close, color: Colors.white),
                      ),
                      Expanded(
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Photo
// -----------------------------------------------------------------------------

class _PhotoViewer extends StatefulWidget {
  const _PhotoViewer({required this.image});

  final ImageProvider image;

  @override
  State<_PhotoViewer> createState() => _PhotoViewerState();
}

class _PhotoViewerState extends State<_PhotoViewer> {
  static const _zoomedScale = 2.5;

  final _transform = TransformationController();
  Offset _lastTap = Offset.zero;

  @override
  void dispose() {
    _transform.dispose();
    super.dispose();
  }

  /// Double-tap toggles between fit and a 2.5x zoom centred on the tap.
  void _toggleZoom() {
    final zoomedIn = _transform.value.getMaxScaleOnAxis() > 1.01;
    if (zoomedIn) {
      _transform.value = Matrix4.identity();
      return;
    }
    const s = _zoomedScale;
    final tx = -_lastTap.dx * (s - 1);
    final ty = -_lastTap.dy * (s - 1);
    _transform.value = Matrix4(
      s,
      0,
      0,
      0,
      0,
      s,
      0,
      0,
      0,
      0,
      1,
      0,
      tx,
      ty,
      0,
      1,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return GestureDetector(
      onDoubleTapDown: (details) => _lastTap = details.localPosition,
      onDoubleTap: _toggleZoom,
      child: InteractiveViewer(
        transformationController: _transform,
        maxScale: 6,
        child: SizedBox.expand(
          child: Image(
            image: widget.image,
            fit: BoxFit.contain,
            loadingBuilder: (context, child, progress) => progress == null
                ? child
                : const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
            errorBuilder: (_, _, _) => Center(
              child: Text(
                l10n.mediaGalleryLoadError,
                style: const TextStyle(color: Colors.white70),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Video
// -----------------------------------------------------------------------------

class _VideoViewer extends StatefulWidget {
  const _VideoViewer({this.url, this.path});

  final String? url;
  final String? path;

  @override
  State<_VideoViewer> createState() => _VideoViewerState();
}

class _VideoViewerState extends State<_VideoViewer> {
  late final VideoPlayerController _controller = widget.url != null
      ? VideoPlayerController.networkUrl(Uri.parse(widget.url!))
      : VideoPlayerController.file(File(widget.path!));
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller
        .initialize()
        .then((_) {
          if (!mounted) return;
          setState(() {});
          unawaited(_controller.play());
        })
        .catchError((Object _) {
          if (mounted) setState(() => _failed = true);
        });
  }

  @override
  void dispose() {
    unawaited(_controller.dispose());
    super.dispose();
  }

  Future<void> _togglePlay(VideoPlayerValue value) async {
    final atEnd =
        value.duration > Duration.zero && value.position >= value.duration;
    if (value.isPlaying) {
      await _controller.pause();
    } else {
      if (atEnd) await _controller.seekTo(Duration.zero);
      await _controller.play();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    if (_failed || _controller.value.hasError) {
      return Center(
        child: Text(
          l10n.mediaGalleryLoadError,
          style: const TextStyle(color: Colors.white70),
        ),
      );
    }
    if (!_controller.value.isInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    return Column(
      children: [
        Expanded(
          child: Center(
            child: AspectRatio(
              aspectRatio: _controller.value.aspectRatio,
              child: VideoPlayer(_controller),
            ),
          ),
        ),
        ValueListenableBuilder<VideoPlayerValue>(
          valueListenable: _controller,
          builder: (context, value, _) {
            final total = value.duration.inMilliseconds;
            final position = value.position.inMilliseconds.clamp(
              0,
              math.max(total, 1),
            );
            final atEnd = total > 0 && position >= total;

            return Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
              child: Row(
                children: [
                  IconButton(
                    iconSize: 40,
                    color: Colors.white,
                    tooltip: value.isPlaying
                        ? l10n.mediaViewerPause
                        : (atEnd
                              ? l10n.mediaViewerReplay
                              : l10n.mediaViewerPlay),
                    onPressed: () => _togglePlay(value),
                    icon: Icon(
                      value.isPlaying
                          ? Icons.pause_circle
                          : (atEnd
                                ? Icons.replay_circle_filled
                                : Icons.play_circle),
                    ),
                  ),
                  Expanded(
                    child: Slider(
                      value: position.toDouble(),
                      max: math.max(total, 1).toDouble(),
                      activeColor: Colors.white,
                      inactiveColor: Colors.white24,
                      onChanged: (v) =>
                          _controller.seekTo(Duration(milliseconds: v.round())),
                    ),
                  ),
                  Text(
                    '${_clock(value.position)} / ${_clock(value.duration)}',
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}

// -----------------------------------------------------------------------------
// Audio
// -----------------------------------------------------------------------------

class _AudioViewer extends StatefulWidget {
  const _AudioViewer({this.url, this.path, this.knownDuration});

  final String? url;
  final String? path;
  final Duration? knownDuration;

  @override
  State<_AudioViewer> createState() => _AudioViewerState();
}

class _AudioViewerState extends State<_AudioViewer>
    with SingleTickerProviderStateMixin {
  final _player = AudioPlayer();
  final _subscriptions = <StreamSubscription<dynamic>>[];
  late final AnimationController _bars = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 2),
  );

  PlayerState _state = PlayerState.stopped;
  Duration _position = Duration.zero;
  late Duration _duration = widget.knownDuration ?? Duration.zero;
  bool _failed = false;

  Source get _source => widget.url != null
      ? UrlSource(widget.url!)
      : DeviceFileSource(widget.path!);

  bool get _playing => _state == PlayerState.playing;

  @override
  void initState() {
    super.initState();
    _subscriptions
      ..add(
        _player.onPlayerStateChanged.listen((s) {
          if (!mounted) return;
          setState(() => _state = s);
          if (s == PlayerState.playing) {
            _bars.repeat();
          } else {
            _bars.stop();
          }
        }),
      )
      ..add(
        _player.onPositionChanged.listen((d) {
          if (mounted) setState(() => _position = d);
        }),
      )
      ..add(
        _player.onDurationChanged.listen((d) {
          if (mounted && d > Duration.zero) setState(() => _duration = d);
        }),
      )
      ..add(
        _player.onPlayerComplete.listen((_) {
          if (mounted) setState(() => _position = Duration.zero);
        }),
      );
    unawaited(_play());
  }

  Future<void> _play() async {
    try {
      await _player.play(_source);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  Future<void> _toggle() async {
    if (_playing) return _player.pause();
    // A finished (or stopped) recording restarts; a paused one resumes.
    if (_state == PlayerState.paused) return _player.resume();
    await _play();
  }

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      unawaited(subscription.cancel());
    }
    _bars.dispose();
    unawaited(_player.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    if (_failed) {
      return Center(
        child: Text(
          l10n.mediaGalleryLoadError,
          style: const TextStyle(color: Colors.white70),
        ),
      );
    }

    final total = math.max(_duration.inMilliseconds, 1);
    final finished = _state == PlayerState.completed;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 96,
              width: double.infinity,
              child: AnimatedBuilder(
                animation: _bars,
                builder: (context, _) => CustomPaint(
                  painter: _BarsPainter(phase: _bars.value, active: _playing),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Slider(
              value: _position.inMilliseconds.clamp(0, total).toDouble(),
              max: total.toDouble(),
              activeColor: Colors.white,
              inactiveColor: Colors.white24,
              onChanged: (v) => _player.seek(Duration(milliseconds: v.round())),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _clock(_position),
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  Text(
                    _clock(_duration),
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            IconButton(
              iconSize: 64,
              color: Colors.white,
              tooltip: _playing
                  ? l10n.mediaViewerPause
                  : (finished ? l10n.mediaViewerReplay : l10n.mediaViewerPlay),
              onPressed: _toggle,
              icon: Icon(
                _playing
                    ? Icons.pause_circle
                    : (finished
                          ? Icons.replay_circle_filled
                          : Icons.play_circle),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A row of bars that ripple while audio plays and rest low when it does not.
class _BarsPainter extends CustomPainter {
  const _BarsPainter({required this.phase, required this.active});

  final double phase;
  final bool active;

  static const _count = 28;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: active ? 0.9 : 0.35)
      ..strokeCap = StrokeCap.round
      ..strokeWidth = math.max(3, size.width / (_count * 2.2));
    final step = size.width / _count;

    for (var i = 0; i < _count; i++) {
      final wave = active
          ? (math.sin(phase * 2 * math.pi * 2 + i * 0.6) + 1) / 2
          : 0.0;
      final height =
          size.height *
          (0.18 + 0.72 * wave * (0.5 + 0.5 * math.sin(i * 0.9).abs()));
      final x = step * (i + 0.5);
      canvas.drawLine(
        Offset(x, size.height / 2 - height / 2),
        Offset(x, size.height / 2 + height / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_BarsPainter old) =>
      old.phase != phase || old.active != active;
}
