import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/utils/file_types.dart';
import '../../domain/incident_media.dart';
import '../../domain/pending_attachment.dart';

/// Capture evidence: photo, video, a voice recording, or a photo/video from the
/// gallery. Everything captured is handed to [onCaptured]; uploading is the
/// caller's decision.
class EvidenceCaptureBar extends StatefulWidget {
  const EvidenceCaptureBar({
    required this.onCaptured,
    super.key,
    this.enabled = true,
  });

  final ValueChanged<PendingAttachment> onCaptured;
  final bool enabled;

  @override
  State<EvidenceCaptureBar> createState() => _EvidenceCaptureBarState();
}

class _EvidenceCaptureBarState extends State<EvidenceCaptureBar> {
  static const _maxVideo = Duration(minutes: 1);
  static const _maxAudio = Duration(minutes: 2);

  final _picker = ImagePicker();
  final _recorder = AudioRecorder();

  Timer? _ticker;
  bool _recording = false;
  Duration _elapsed = Duration.zero;
  String? _error;

  @override
  void dispose() {
    _ticker?.cancel();
    unawaited(_recorder.dispose());
    super.dispose();
  }

  void _emit(MediaKind kind, String path, [Duration? duration]) {
    widget.onCaptured(
      PendingAttachment(
        id: '${DateTime.now().microsecondsSinceEpoch}',
        kind: kind,
        path: path,
        duration: duration,
      ),
    );
  }

  Future<void> _capture(Future<XFile?> Function() pick, MediaKind kind) async {
    final l10n = context.l10n;
    setState(() => _error = null);
    try {
      final file = await pick();
      if (file == null) return;
      if (!isAllowedUpload(file.path)) {
        setState(() => _error = l10n.mediaAttachmentUnsupportedFile);
        return;
      }
      _emit(kind, file.path);
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n.myActiveIncidentPanelMediaError);
      }
    }
  }

  Future<void> _pickFromGallery() async {
    final l10n = context.l10n;
    setState(() => _error = null);
    try {
      final file = await _picker.pickMedia();
      if (file == null) return;
      final extension = extensionOf(file.path);
      if (imageExtensions.contains(extension)) {
        _emit(MediaKind.photo, file.path);
      } else if (videoExtensions.contains(extension)) {
        _emit(MediaKind.video, file.path);
      } else if (mounted) {
        setState(() => _error = l10n.mediaAttachmentUnsupportedFile);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n.myActiveIncidentPanelMediaError);
      }
    }
  }

  Future<void> _toggleRecording() async {
    if (_recording) return _stopRecording();

    final l10n = context.l10n;
    setState(() => _error = null);
    try {
      if (!await _recorder.hasPermission()) {
        if (mounted) setState(() => _error = l10n.mediaAttachmentMicDenied);
        return;
      }
      final directory = await getTemporaryDirectory();
      final path =
          '${directory.path}/evidence_${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: path,
      );

      setState(() {
        _recording = true;
        _elapsed = Duration.zero;
      });
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _elapsed += const Duration(seconds: 1));
        if (_elapsed >= _maxAudio) unawaited(_stopRecording());
      });
    } catch (_) {
      if (mounted) setState(() => _error = l10n.mediaAttachmentMicError);
    }
  }

  Future<void> _stopRecording() async {
    _ticker?.cancel();
    final duration = _elapsed;
    final path = await _recorder.stop();
    if (!mounted) return;
    setState(() => _recording = false);
    if (path != null) _emit(MediaKind.audio, path, duration);
  }

  String _clock(Duration d) =>
      '${d.inMinutes.remainder(60).toString().padLeft(2, '0')}:${d.inSeconds.remainder(60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final enabled = widget.enabled && !_recording;

    Widget action(
      IconData icon,
      String label,
      VoidCallback? onTap, {
      Color? color,
    }) => OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: color ?? p.text,
        side: BorderSide(color: color ?? p.border),
        backgroundColor: p.surface,
        visualDensity: VisualDensity.compact,
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            action(
              Icons.photo_camera_outlined,
              l10n.mediaAttachmentPhoto,
              enabled
                  ? () => _capture(
                      () => _picker.pickImage(
                        source: ImageSource.camera,
                        imageQuality: 85,
                        maxWidth: 2048,
                      ),
                      MediaKind.photo,
                    )
                  : null,
            ),
            action(
              Icons.videocam_outlined,
              l10n.mediaAttachmentVideo,
              enabled
                  ? () => _capture(
                      () => _picker.pickVideo(
                        source: ImageSource.camera,
                        maxDuration: _maxVideo,
                      ),
                      MediaKind.video,
                    )
                  : null,
            ),
            action(
              _recording ? Icons.stop_circle_outlined : Icons.mic_none,
              _recording ? _clock(_elapsed) : l10n.mediaAttachmentRecordAudio,
              widget.enabled ? _toggleRecording : null,
              color: _recording ? p.danger : null,
            ),
            action(
              Icons.upload_file_outlined,
              l10n.mediaAttachmentUpload,
              enabled ? _pickFromGallery : null,
            ),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(fontSize: 12, color: p.danger)),
        ],
      ],
    );
  }
}
