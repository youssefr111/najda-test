"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Play, Pause } from "lucide-react";
import MediaCaptureBar from "@/components/Shared/MediaCaptureBar";
import { formatDuration, type CapturedMedia } from "@/lib/media/capture";

export interface Attachment {
  id: string;
  type: CapturedMedia["type"];
  url: string;
  blob: Blob;
  durationSec?: number;
}

interface MediaAttachmentProps {
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

export default function MediaAttachment({ attachments, setAttachments }: MediaAttachmentProps) {
  const t = useTranslations("mediaAttachment");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Mirrors the latest list so the unmount cleanup can release every preview URL.
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => () => {
    attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url));
    audioElRef.current?.pause();
  }, []);

  const handleAdd = ({ type, blob, durationSec }: CapturedMedia) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setAttachments((prev) => [...prev, { id, type, url: URL.createObjectURL(blob), blob, durationSec }]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const togglePlayback = (attachment: Attachment) => {
    if (playingId === attachment.id) {
      audioElRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioElRef.current?.pause();
    const audioEl = new Audio(attachment.url);
    audioElRef.current = audioEl;
    audioEl.onended = () => setPlayingId(null);
    void audioEl.play();
    setPlayingId(attachment.id);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-[14px] leading-5 font-bold text-[#5b403f] dark:text-[#c9b8b6] uppercase tracking-wider">
        {t("title")}
      </h2>

      <MediaCaptureBar onAdd={handleAdd} />

      {attachments.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="relative shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-[#e4bebc] dark:border-[#3a2f2e] bg-[#f8f9fa] dark:bg-[#1a1a1c]"
            >
              <button
                type="button"
                aria-label={t("removeAttachment")}
                onClick={() => removeAttachment(a.id)}
                className="absolute top-1 right-1 z-10 w-6 h-6 cursor-pointer rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>

              {a.type === "photo" && (
                <Image src={a.url} width={50} height={50} alt={t("attachedPhoto")} className="w-full h-full object-cover" />
              )}

              {a.type === "video" && (
                <video src={a.url} className="w-full h-full object-cover" muted playsInline />
              )}

              {a.type === "audio" && (
                <button
                  type="button"
                  onClick={() => togglePlayback(a)}
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-1 bg-[#edeeef] dark:bg-[#242426]"
                >
                  {playingId === a.id ? (
                    <Pause className="h-6 w-6 text-[#b7102a]" />
                  ) : (
                    <Play className="h-6 w-6 text-[#b7102a]" />
                  )}
                  <span className="text-[11px] font-medium dark:text-[#f3f4f5]">
                    {a.durationSec ? formatDuration(a.durationSec) : t("audio")}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}