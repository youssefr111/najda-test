"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useMediaDownloadUrl } from "@/hooks/incidents/useMediaDownloadUrl";
import { useDeleteMedia } from "@/hooks/incidents/useDeleteMedia";
import type { IncidentMedia } from "@/types/incident";

export default function IncidentMediaGallery({ media, canDelete }: { media: IncidentMedia[]; canDelete: boolean }) {
  const [lightboxMedia, setLightboxMedia] = useState<IncidentMedia | null>(null);

  if (media.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {media.map((m) => (
          <MediaTile key={m.id} media={m} canDelete={canDelete} onOpen={() => setLightboxMedia(m)} />
        ))}
      </div>
      {lightboxMedia && <MediaLightbox media={lightboxMedia} onClose={() => setLightboxMedia(null)} />}
    </>
  );
}

function MediaTile({ media, canDelete, onOpen }: { media: IncidentMedia; canDelete: boolean; onOpen: () => void }) {
  const t = useTranslations("common");
  const { data, isLoading } = useMediaDownloadUrl(media.id);
  const deleteMedia = useDeleteMedia();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
      {isLoading || !data ? (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">…</div>
      ) : (
        <button type="button" onClick={onOpen} className="block w-full h-full items-center justify-center text-xs cursor-pointer text-slate-500 dark:text-slate-400">
          {media.mediaType === "PHOTO" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.downloadUrl} alt="Evidence" className="w-full h-full object-cover" />
          ) : (
            media.mediaType
          )}
        </button>
      )}

      {canDelete && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
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
                  className="px-2 py-1 bg-red-600 text-white text-[11px] font-medium rounded disabled:opacity-50"
                >
                  {deleteMedia.isPending ? "…" : t("delete")}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1 bg-white/20 text-white text-[11px] rounded">
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MediaLightbox({ media, onClose }: { media: IncidentMedia; onClose: () => void }) {
  const t = useTranslations("common");
  const { data, isLoading } = useMediaDownloadUrl(media.id);

  return (
    <div className="fixed inset-0 z-80 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
        <X className="w-5 h-5" />
      </button>

      {isLoading || !data ? (
        <p className="text-white text-sm">{t("loading")}</p>
      ) : media.mediaType === "PHOTO" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.downloadUrl} alt="Evidence" onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full object-contain rounded-md" />
      ) : media.mediaType === "VIDEO" ? (
        <video src={data.downloadUrl} controls autoPlay onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full rounded-md" />
      ) : media.mediaType === "AUDIO" ? (
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-xl p-6">
          <audio src={data.downloadUrl} controls autoPlay />
        </div>
      ) : null}
    </div>
  );
}