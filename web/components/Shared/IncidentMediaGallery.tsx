"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Play, Mic } from "lucide-react";
import { useMediaDownloadUrl } from "@/hooks/incidents/useMediaDownloadUrl";
import { useDeleteMedia } from "@/hooks/incidents/useDeleteMedia";
import { TranscriptBadge, TranscriptHover, TranscriptList, TranscriptPanel } from "@/components/Shared/MediaTranscript";
import type { IncidentMedia, MediaType } from "@/types/incident";

/**
 * Evidence tiles for an incident. With showTranscripts (the default) each tile also carries the automatic
 * transcript / description: a status badge, a hover preview, the full text in the lightbox, and a readable list
 * under the grid. Pass false where the viewer is the person who recorded it (the citizen's own panel).
 */
export default function IncidentMediaGallery({
  media,
  canDelete,
  showTranscripts = true,
}: {
  media: IncidentMedia[];
  canDelete: boolean;
  showTranscripts?: boolean;
}) {
  const [lightboxMedia, setLightboxMedia] = useState<IncidentMedia | null>(null);

  if (media.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {media.map((m) => (
          <MediaTile key={m.id} media={m} canDelete={canDelete} showTranscripts={showTranscripts} onOpen={() => setLightboxMedia(m)} />
        ))}
      </div>
      {showTranscripts && <TranscriptList media={media} />}
      {lightboxMedia && <MediaLightbox media={lightboxMedia} showTranscripts={showTranscripts} onClose={() => setLightboxMedia(null)} />}
    </>
  );
}

function MediaTile({
  media,
  canDelete,
  showTranscripts,
  onOpen,
}: {
  media: IncidentMedia;
  canDelete: boolean;
  showTranscripts: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations("common");
  const { data, isLoading } = useMediaDownloadUrl(media.id);
  const deleteMedia = useDeleteMedia();
  const [confirming, setConfirming] = useState(false);

  const tile = (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
      {isLoading || !data ? (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">…</div>
      ) : (
        <button type="button" onClick={onOpen} className="block w-full h-full items-center justify-center text-xs cursor-pointer text-slate-500 dark:text-slate-400">
          <MediaPreview mediaType={media.mediaType} url={data.downloadUrl} />
        </button>
      )}

      {showTranscripts && <TranscriptBadge media={media} />}

      {canDelete && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="absolute top-1 right-1 w-5 h-5 cursor-pointer rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3" />
          </button>

          {confirming && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-2">
              <p className="text-[11px] text-white text-center">Delete this file?</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => deleteMedia.mutate(media.id, { onSuccess: () => setConfirming(false) })}
                  disabled={deleteMedia.isPending}
                  className="px-2 py-1 cursor-pointer bg-red-600 text-white text-[11px] font-medium rounded disabled:opacity-50"
                >
                  {deleteMedia.isPending ? "…" : t("delete")}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1 cursor-pointer bg-white/20 text-white text-[11px] rounded">
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return showTranscripts ? <TranscriptHover media={media}>{tile}</TranscriptHover> : tile;
}

function MediaPreview({ mediaType, url }: { mediaType: MediaType; url: string }) {
  switch (mediaType) {
    case "PHOTO":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
      );

    case "VIDEO":
      return (
        <div className="relative w-full h-full">
          {/* "#t=0.1" asks the browser to show a frame from the very start as the thumbnail;
              preload="metadata" keeps it from downloading the whole video for a tile. */}
          <video src={`${url}#t=0.1`} preload="metadata" muted playsInline className="w-full h-full object-cover pointer-events-none" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-8 h-8 rounded-full bg-black/55 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </span>
          </span>
        </div>
      );

    case "AUDIO":
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Mic className="w-6 h-6" />
        </div>
      );

    default:
      return null;
  }
}

function MediaLightbox({ media, showTranscripts, onClose }: { media: IncidentMedia; showTranscripts: boolean; onClose: () => void }) {
  const t = useTranslations("common");
  const { data, isLoading } = useMediaDownloadUrl(media.id);
  const withPanel = showTranscripts && !!media.transcriptStatus;
  const maxHeight = withPanel ? "max-h-[55vh]" : "max-h-full";

  return (
    <div className="fixed inset-0 z-80 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full cursor-pointer bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
        <X className="w-5 h-5" />
      </button>

      {isLoading || !data ? (
        <p className="text-white text-sm">{t("loading")}</p>
      ) : (
        // One column: the media on top, its automatic transcript underneath. Clicking the column keeps the lightbox
        // open; only the dark backdrop around it closes it.
        <div className="flex max-h-full w-full max-w-3xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {media.mediaType === "PHOTO" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.downloadUrl} alt="Evidence" className={`min-h-0 max-w-full object-contain rounded-md ${maxHeight}`} />
          ) : media.mediaType === "VIDEO" ? (
            <video src={data.downloadUrl} controls autoPlay className={`min-h-0 max-w-full rounded-md ${maxHeight}`} />
          ) : media.mediaType === "AUDIO" ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6">
              <audio src={data.downloadUrl} controls autoPlay />
            </div>
          ) : null}

          {showTranscripts && <TranscriptPanel media={media} />}
        </div>
      )}
    </div>
  );
}