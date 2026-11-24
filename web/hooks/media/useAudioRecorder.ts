import { useCallback, useEffect, useRef, useState } from "react";

const PREFERRED_MIME_TYPES = ["audio/webm", "audio/mp4"];
const MAX_DURATION_SEC = 300;

export interface RecordedAudio {
  blob: Blob;
  durationSec: number;
}

export type RecorderError = "denied" | "unsupported" | "failed";

export function useAudioRecorder(onRecorded: (audio: RecordedAudio) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<RecorderError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const onRecordedRef = useRef(onRecorded);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
  }, [onRecorded]);

  const releaseResources = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        releaseResources();
        setIsRecording(false);
        setSeconds(0);
        onRecordedRef.current({ blob, durationSec });
      };

      startedAtRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_DURATION_SEC) recorder.stop();
      }, 500);
    } catch (err) {
      releaseResources();
      setError(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "failed");
    }
  }, [releaseResources]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) stop();
    else void start();
  }, [isRecording, start, stop]);

  // Leaving the screen mid-recording discards it quietly instead of firing onRecorded.
  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    releaseResources();
  }, [releaseResources]);

  return { isRecording, seconds, error, toggle };
}