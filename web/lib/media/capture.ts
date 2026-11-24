import type { MediaType } from "@/types/incident";

export type CapturedMediaType = "photo" | "video" | "audio";

export interface CapturedMedia {
  type: CapturedMediaType;
  blob: Blob;
  durationSec?: number;
}

export const INCIDENT_MEDIA_TYPE: Record<CapturedMediaType, Exclude<MediaType, "TEXT">> = {
  photo: "PHOTO",
  video: "VIDEO",
  audio: "AUDIO",
};

export function detectMediaType(file: Blob): CapturedMediaType | null {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}