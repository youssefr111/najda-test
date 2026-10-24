import '../../../../core/config/flavor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../application/incident_providers.dart';
import '../../application/media_providers.dart';
import '../../data/incident_media_repository.dart';
import '../../domain/incident_media.dart';
import 'media_viewer.dart';

/// Thumbnails of an incident's photos, videos and recordings. Tapping opens the
/// full-screen viewer (zoomable photo, playable video, playable recording);
/// every file is fetched through a fresh signed link.
class IncidentMediaGallery extends ConsumerWidget {
  const IncidentMediaGallery({
    required this.incidentId,
    required this.items,
    required this.canDelete,
    super.key,
  });

  final int incidentId;
  final List<IncidentMedia> items;
  final bool canDelete;

  Future<void> _delete(BuildContext context, WidgetRef ref, IncidentMedia media) async {
    final l10n = context.l10n;
    final confirmed = await confirmAction(
      context,
      title: l10n.mediaGalleryDeleteConfirm,
      confirmLabel: l10n.mediaGalleryDelete,
      destructive: true,
    );
    if (!confirmed) return;

    try {
      await ref.read(incidentMediaRepositoryProvider).delete(media.id);
      ref.invalidate(incidentProvider(incidentId));
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.myActiveIncidentPanelMediaError)),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (final media in items)
          _Tile(
            media: media,
            canDelete: canDelete,
            onOpen: () => showMediaViewer(context, kind: media.kind, source: RemoteMedia(media.id)),
            onDelete: () => _delete(context, ref, media),
          ),
      ],
    );
  }
}

class _Tile extends ConsumerWidget {
  const _Tile({required this.media, required this.canDelete, required this.onOpen, required this.onDelete});

  final IncidentMedia media;
  final bool canDelete;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    // A tile that cannot load can be tapped to try again; test builds also say why (HTTP status / message).
    Widget broken([Object? error]) => InkWell(
          onTap: () => ref.invalidate(mediaDownloadUrlProvider(media.id)),
          child: Padding(
            padding: const EdgeInsets.all(6),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.refresh_rounded, color: p.textMuted),
                if (!Flavor.current.isProduction && error != null)
                  Text('$error', maxLines: 3, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 9, color: p.danger)),
              ],
            ),
          ),
        );

    final label = switch (media.kind) {
      MediaKind.photo => l10n.mediaViewerPhoto,
      MediaKind.video => l10n.mediaViewerVideo,
      _ => l10n.mediaViewerAudio,
    };

    final content = switch (media.kind) {
      MediaKind.photo => ref.watch(mediaDownloadUrlProvider(media.id)).when(
            data: (url) => Image.network(url, fit: BoxFit.cover, cacheWidth: 300, errorBuilder: (_, error, _) => broken(error)),
            loading: () => const Center(
              child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            ),
            error: (error, _) => broken(error),
          ),
      MediaKind.video => _PlayBadge(icon: Icons.videocam_rounded, color: p.textMuted),
      _ => _PlayBadge(icon: Icons.mic_rounded, color: p.textMuted),
    };

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Semantics(
          button: true,
          label: label,
          child: Material(
            color: p.surfaceAlt,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: p.border),
            ),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: onOpen,
              child: SizedBox(height: 96, width: 96, child: Center(child: content)),
            ),
          ),
        ),
        if (canDelete)
          PositionedDirectional(
            top: -6,
            end: -6,
            child: Material(
              color: p.danger,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onDelete,
                child: const Padding(
                  padding: EdgeInsets.all(5),
                  child: Icon(Icons.delete_outline, size: 14, color: Colors.white),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Media-type icon with a play badge: tells the citizen it can be played.
class _PlayBadge extends StatelessWidget {
  const _PlayBadge({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Stack(
      alignment: Alignment.center,
      children: [
        Icon(icon, size: 36, color: color),
        PositionedDirectional(
          bottom: 8,
          end: 8,
          child: Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: p.primary, shape: BoxShape.circle),
            child: const Icon(Icons.play_arrow_rounded, size: 14, color: Colors.white),
          ),
        ),
      ],
    );
  }
}
