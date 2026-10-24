"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Video, Mic, Square, Upload } from "lucide-react";
import { useAudioRecorder } from "@/hooks/media/useAudioRecorder";
import { useIsTouchDevice } from "@/hooks/media/useIsTouchDevice";
import { detectMediaType, formatDuration, type CapturedMedia } from "@/lib/media/capture";

const RECORDER_ERROR_KEYS = {
  denied: "micDenied",
  unsupported: "micUnsupported",
  failed: "micError",
} as const;

interface MediaCaptureBarProps {
  onAdd: (media: CapturedMedia) => void;
  disabled?: boolean;
}

/**
 * One consistent way to add evidence: take a photo, record a video, record audio,
 * or upload existing files. The camera inputs use `capture` (opens the camera on
 * phones, a file picker on desktop); the upload input deliberately has no `capture`
 * so phones offer the gallery and file browser.
 */
export default function MediaCaptureBar({ onAdd, disabled }: MediaCaptureBarProps) {
  const t = useTranslations("mediaAttachment");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const hasCamera = useIsTouchDevice();

  const recorder = useAudioRecorder(({ blob, durationSec }) => onAdd({ type: "audio", blob, durationSec }));

  function handleFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    for (const file of Array.from(event.target.files ?? [])) {
      const type = detectMediaType(file);
      if (type) onAdd({ type, blob: file });
      else setFileError(t("unsupportedFile"));
    }
    event.target.value = "";
  }

  const errorMessage = fileError ?? (recorder.error ? t(RECORDER_ERROR_KEYS[recorder.error]) : null);

  return (
    <div className="space-y-2">
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFilesChosen} />
      <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFilesChosen} />
      <input ref={uploadInputRef} type="file" accept="image/*,video/*,audio/*" multiple className="hidden" onChange={handleFilesChosen} />

      <div className="flex gap-4 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
        <CaptureTile
          icon={<Upload className="h-7.5 w-7.5 text-[#b7102a]" />}
          label={t("upload")}
          onClick={() => uploadInputRef.current?.click()}
          disabled={disabled}
        />
        {hasCamera && (
          <>
            <CaptureTile
              icon={<Camera className="h-7.5 w-7.5 text-[#b7102a]" />}
              label={t("photo")}
              onClick={() => photoInputRef.current?.click()}
              disabled={disabled}
            />
            <CaptureTile
              icon={<Video className="h-7.5 w-7.5 text-[#b7102a]" />}
              label={t("video")}
              onClick={() => videoInputRef.current?.click()}
              disabled={disabled}
            />
          </>
        )}
        <CaptureTile
          recording={recorder.isRecording}
          icon={recorder.isRecording
            ? <Square className="h-7.5 w-7.5 text-white" fill="white" />
            : <Mic className="h-7.5 w-7.5 text-[#b7102a]" />}
          label={recorder.isRecording ? formatDuration(recorder.seconds) : t("recordAudio")}
          onClick={recorder.toggle}
          disabled={disabled && !recorder.isRecording}
        />
      </div>

      {errorMessage && <p className="text-[13px] text-[#b7102a]">{errorMessage}</p>}
    </div>
  );
}

function CaptureTile({ icon, label, onClick, disabled, recording = false }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  recording?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 w-24 h-24 flex flex-col items-center justify-center gap-1 rounded-2xl cursor-pointer border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        recording
          ? "bg-[#b7102a] border-[#b7102a] animate-pulse"
          : "bg-[#edeeef] dark:bg-[#242426] border-dashed border-[#8f6f6e] dark:border-[#5a4a49] hover:border-[#b7102a]"
      }`}
    >
      {icon}
      <span className={`text-[12px] leading-4 font-medium ${recording ? "text-white" : "dark:text-[#f3f4f5]"}`}>{label}</span>
    </button>
  );
}