"use client";

import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Camera, Video, Mic, Square, X, Play, Pause } from "lucide-react";

export interface Attachment {
  id: string;
  type: "photo" | "video" | "audio";
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Revoke object URLs on unmount to avoid leaking memory
  useEffect(() => {
    return () => {
      attachments.forEach((a) => URL.revokeObjectURL(a.url));
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addAttachment = (type: Attachment["type"], blob: Blob, durationSec?: number) => {
    const url = URL.createObjectURL(blob);
    setAttachments((prev) => [
      ...prev,
      { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, url, blob, durationSec },
    ]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addAttachment("photo", file);
    e.target.value = "";
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addAttachment("video", file);
    e.target.value = "";
  };

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        addAttachment("audio", blob, recordSeconds);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
        setRecordSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setMicError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? t("micDenied")
          : t("micError")
      );
    }
  };

  const handleAudioButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlayback = (attachment: Attachment) => {
    if (playingId === attachment.id) {
      audioElRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
    const audioEl = new Audio(attachment.url);
    audioElRef.current = audioEl;
    audioEl.play();
    audioEl.onended = () => setPlayingId(null);
    setPlayingId(attachment.id);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-[14px] leading-5 font-bold text-[#5b403f] dark:text-[#c9b8b6] uppercase tracking-wider">
        {t("title")}
      </h2>

      {/* Hidden file inputs — capture="environment" opens the rear camera directly on mobile */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleVideoChange}
      />

      <div className="flex gap-4 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="shrink-0 w-24 h-24 flex flex-col items-center justify-center gap-1 rounded-2xl cursor-pointer bg-[#edeeef] dark:bg-[#242426] border-2 border-dashed border-[#8f6f6e] dark:border-[#5a4a49] hover:border-[#b7102a]"
        >
          <Camera className="h-7.5 w-7.5 text-[#b7102a]" />
          <span className="text-[12px] leading-4 font-medium dark:text-[#f3f4f5]">{t("photo")}</span>
        </button>

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="shrink-0 w-24 h-24 flex flex-col items-center justify-center gap-1 rounded-2xl cursor-pointer bg-[#edeeef] dark:bg-[#242426] border-2 border-dashed border-[#8f6f6e] dark:border-[#5a4a49] hover:border-[#b7102a]"
        >
          <Video className="h-7.5 w-7.5 text-[#b7102a]" />
          <span className="text-[12px] leading-4 font-medium dark:text-[#f3f4f5]">{t("video")}</span>
        </button>

        <button
          type="button"
          onClick={handleAudioButtonClick}
          className={`shrink-0 w-24 h-24 flex flex-col items-center justify-center gap-1 rounded-2xl cursor-pointer border-2 transition-colors ${
            isRecording
              ? "bg-[#b7102a] border-[#b7102a] animate-pulse"
              : "bg-[#edeeef] dark:bg-[#242426] border-dashed border-[#8f6f6e] dark:border-[#5a4a49] hover:border-[#b7102a]"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="h-7.5 w-7.5 text-white" fill="white" />
              <span className="text-[12px] leading-4 font-medium text-white">
                {formatTime(recordSeconds)}
              </span>
            </>
          ) : (
            <>
              <Mic className="h-7.5 w-7.5 text-[#b7102a]" />
              <span className="text-[12px] leading-4 font-medium dark:text-[#f3f4f5]">{t("audio")}</span>
            </>
          )}
        </button>
      </div>

      {micError && <p className="text-[13px] text-[#b7102a]">{micError}</p>}

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
                className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
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
                  className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#edeeef] dark:bg-[#242426]"
                >
                  {playingId === a.id ? (
                    <Pause className="h-6 w-6 text-[#b7102a]" />
                  ) : (
                    <Play className="h-6 w-6 text-[#b7102a]" />
                  )}
                  <span className="text-[11px] font-medium dark:text-[#f3f4f5]">
                    {a.durationSec ? formatTime(a.durationSec) : t("audio")}
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