import 'dart:io';

import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../domain/incident_media.dart';
import '../../domain/pending_attachment.dart';
import 'media_viewer.dart';

/// Thumbnails of captured-but-not-sent evidence. Tap one to look at it, watch
/// it or listen to it in full screen before it is sent; the corner button
/// removes it.
class PendingAttachmentList extends StatelessWidget {
  const PendingAttachmentList({
    required this.items,
    required this.onRemove,
    super.key,
  });

  final List<PendingAttachment> items;
  final ValueChanged<PendingAttachment> onRemove;

  void _open(BuildContext context, PendingAttachment item) => showMediaViewer(
    context,
    kind: item.kind,
    source: LocalMedia(item.path, duration: item.duration),
  );

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    final p = context.palette;
    final l10n = context.l10n;

    String clock(Duration d) =>
        '${d.inMinutes.toString().padLeft(2, '0')}:${d.inSeconds.remainder(60).toString().padLeft(2, '0')}';

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (final item in items)
          Stack(
            clipBehavior: Clip.none,
            children: [
              Material(
                color: p.surfaceAlt,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(color: p.border),
                ),
                clipBehavior: Clip.antiAlias,
                child: Semantics(
                  button: true,
                  label: switch (item.kind) {
                    MediaKind.photo => l10n.mediaViewerPhoto,
                    MediaKind.video => l10n.mediaViewerVideo,
                    _ => l10n.mediaViewerAudio,
                  },
                  child: InkWell(
                    onTap: () => _open(context, item),
                    child: SizedBox(
                      height: 84,
                      width: 84,
                      child: switch (item.kind) {
                        MediaKind.photo => Image.file(
                          File(item.path),
                          fit: BoxFit.cover,
                          cacheWidth: 260,
                          semanticLabel: l10n.mediaAttachmentAttachedPhoto,
                          errorBuilder: (_, _, _) => Icon(
                            Icons.broken_image_outlined,
                            color: p.textMuted,
                          ),
                        ),
                        MediaKind.video => _Badge(
                          icon: Icons.videocam_rounded,
                          color: p.textMuted,
                        ),
                        _ => _Badge(
                          icon: Icons.mic_rounded,
                          color: p.textMuted,
                          caption: item.duration == null
                              ? null
                              : clock(item.duration!),
                        ),
                      },
                    ),
                  ),
                ),
              ),
              PositionedDirectional(
                top: -6,
                end: -6,
                child: Material(
                  color: p.danger,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () => onRemove(item),
                    child: Tooltip(
                      message: l10n.mediaAttachmentRemoveAttachment,
                      child: const Padding(
                        padding: EdgeInsets.all(5),
                        child: Icon(Icons.close, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.icon, required this.color, this.caption});

  final IconData icon;
  final Color color;
  final String? caption;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Stack(
      alignment: Alignment.center,
      children: [
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 30, color: color),
            if (caption != null)
              Text(
                caption!,
                style: TextStyle(fontSize: 11, color: color),
                textDirection: TextDirection.ltr,
              ),
          ],
        ),
        PositionedDirectional(
          bottom: 6,
          end: 6,
          child: Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: p.primary, shape: BoxShape.circle),
            child: const Icon(
              Icons.play_arrow_rounded,
              size: 14,
              color: Colors.white,
            ),
          ),
        ),
      ],
    );
  }
}
