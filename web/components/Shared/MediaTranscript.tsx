/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Check, Copy, FileText, Loader2, Mic, TriangleAlert, Video, Earth } from "lucide-react";
import type { IncidentMedia, MediaType } from "@/types/incident";

const CARD_WIDTH = 288;

/** The automatic text of an attachment: only once the analysis finished and actually found something. */
export function transcriptOf(media: IncidentMedia): string | null {
  if (media.transcriptStatus !== "DONE") return null;
  return media.transcript?.trim() || null;
}

const isWaiting = (m: IncidentMedia) => m.transcriptStatus === "PENDING" || m.transcriptStatus === "PROCESSING";

/** A language's name in the interface language ("Arabic" / "العربية"), or null for an unknown code. */
function languageName(code: string | null | undefined, locale: string): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? null;
  } catch {
    return null;
  }
}

/** One written version of an attachment's text, with the language it is written in (when known). */
interface Version {
  text: string;
  lang?: string;
}

/**
 * The versions of the automatic text to show. A voice note or video has one: the words as spoken, in whatever
 * language it was. A photo has its English description and, when the model gave one, an Arabic version: the one
 * matching the interface language comes first.
 */
function versionsOf(media: IncidentMedia, locale: string): { primary: Version; secondary: Version | null } | null {
  const original = transcriptOf(media);
  if (!original) return null;
  const photo = media.mediaType === "PHOTO";
  const first: Version = { text: original, lang: photo ? "en" : media.transcriptLanguage ?? undefined };
  const arabic = photo ? media.transcriptAr?.trim() || null : null;
  if (!arabic) return { primary: first, secondary: null };
  const second: Version = { text: arabic, lang: "ar" };
  return locale.startsWith("ar") ? { primary: second, secondary: first } : { primary: first, secondary: second };
}

/** "Arabic", for a voice note or video whose language the model detected. */
function LanguageChip({ media }: { media: IncidentMedia }) {
  const t = useTranslations("mediaTranscript");
  const locale = useLocale();
  const name = media.mediaType === "PHOTO" ? null : languageName(media.transcriptLanguage, locale);
  if (!name || transcriptOf(media) === null) return null;
  return (
    <span
      title={t("detectedLanguage")}
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    >
      <Earth className="h-3 w-3" aria-hidden="true" />
      {name}
    </span>
  );
}

function KindIcon({ type, className }: { type: MediaType; className?: string }) {
  if (type === "PHOTO") return <Camera className={className} aria-hidden="true" />;
  if (type === "VIDEO") return <Video className={className} aria-hidden="true" />;
  return <Mic className={className} aria-hidden="true" />;
}

/** One line telling the reader the text is machine-made (it can contain errors). */
function AutoLabel({ type, className }: { type: MediaType; className?: string }) {
  const t = useTranslations("mediaTranscript");
  return <p className={className ?? "text-[11px] text-slate-500 dark:text-slate-400"}>{type === "PHOTO" ? t("autoDescription") : t("autoTranscript")}</p>;
}

/** The text itself. dir="auto" so Arabic reads right-to-left and English left-to-right whatever the UI language is. */
function TranscriptText({ text, lang, className = "" }: { text: string; lang?: string; className?: string }) {
  return <p dir="auto" lang={lang} className={`whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-900 dark:text-slate-100 ${className}`}>{text}</p>;
}

/** Small status chip laid over a tile's corner: still working / has text / no speech / gave up. */
export function TranscriptBadge({ media }: { media: IncidentMedia }) {
  const t = useTranslations("mediaTranscript");
  const status = media.transcriptStatus;
  if (!status) return null;

  const photo = media.mediaType === "PHOTO";
  let icon: ReactNode;
  let label: string;
  let tone: string;
  if (isWaiting(media)) {
    icon = <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />;
    label = photo ? t("describing") : t("transcribing");
    tone = "bg-black/65 text-white";
  } else if (status === "FAILED") {
    icon = <TriangleAlert className="h-3 w-3" aria-hidden="true" />;
    label = t("unavailable");
    tone = "bg-amber-500 text-white";
  } else if (transcriptOf(media)) {
    icon = <FileText className="h-3 w-3" aria-hidden="true" />;
    label = t("hasText");
    tone = "bg-blue-600 text-white";
  } else if (!photo) {
    icon = <Mic className="h-3 w-3 opacity-70" aria-hidden="true" />;
    label = t("noSpeech");
    tone = "bg-slate-500/80 text-white";
  } else {
    return null;
  }

  return (
    <span title={label} className={`pointer-events-auto absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full shadow ${tone}`}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Wraps a tile. After a short hover (mouse only) or keyboard focus it shows a preview card with the automatic text.
 * The card is portalled to <body> and positioned with fixed coordinates, so no scrolling panel can clip it.
 * It is a convenience: the full text is always reachable in the lightbox and in the transcript list.
 */
export function TranscriptHover({ media, children }: { media: IncidentMedia; children: ReactNode }) {
  const t = useTranslations("mediaTranscript");
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const text = transcriptOf(media);
  const locale = useLocale(); 
  const shown = versionsOf(media, locale)?.primary;

  useEffect(() => () => clearTimeout(timer.current), []);

  // A fixed card would be left floating if the page moves under it.
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  if (!text) return <>{children}</>;

  const open = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.min(Math.max(8, r.left + r.width / 2 - CARD_WIDTH / 2), window.innerWidth - CARD_WIDTH - 8);
      // Open below the tile, or above it when the tile sits in the lower part of the screen.
      setPos(r.bottom > window.innerHeight * 0.6 ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: r.bottom + 8 });
    }, 250);
  };
  const close = () => {
    clearTimeout(timer.current);
    setPos(null);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") open(); }}
      onPointerLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {children}
      {pos && createPortal(
        <div
          id={id}
          role="tooltip"
          style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: CARD_WIDTH }}
          className="pointer-events-none z-70 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <KindIcon type={media.mediaType} className="h-3.5 w-3.5 text-slate-400" />
            <AutoLabel type={media.mediaType} className="text-[11px] font-medium text-slate-500 dark:text-slate-400" />
            <LanguageChip media={media} />
          </div>
          <TranscriptText text={shown?.text ?? text} lang={shown?.lang} className="line-clamp-6" />
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{t("openHint")}</p>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** The full text under the media in the lightbox: status, scrollable text, copy button. */
export function TranscriptPanel({ media }: { media: IncidentMedia }) {
  const t = useTranslations("mediaTranscript");
  const [copied, setCopied] = useState(false);
  const status = media.transcriptStatus;
  const text = transcriptOf(media);
  const locale = useLocale(); 
  const versions = versionsOf(media, locale);
  if (!status) return null;

  async function copy() {
    if (!versions) return;
    try {
      // Everything the dispatcher can see, in the order they see it.
      await navigator.clipboard.writeText([versions.primary.text, versions.secondary?.text].filter(Boolean).join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. an insecure origin): nothing to do */
    }
  }

  const photo = media.mediaType === "PHOTO";
  let body: ReactNode;
  if (isWaiting(media)) {
    body = (
      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {photo ? t("describing") : t("transcribing")}
      </p>
    );
  } else if (status === "FAILED") {
    body = (
      <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
        <TriangleAlert className="h-4 w-4" aria-hidden="true" /> {t("unavailable")}
      </p>
    );
  } else if (versions) {
    body = (
      <div className="max-h-48 space-y-3 overflow-y-auto pe-1">
        <TranscriptText text={versions.primary.text} lang={versions.primary.lang} />
        {versions.secondary && (
          <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
            <p className="mb-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">{languageName(versions.secondary.lang, locale)}</p>
            <TranscriptText text={versions.secondary.text} lang={versions.secondary.lang} className="text-slate-600 dark:text-slate-300" />
          </div>
        )}
      </div>
    );
  } else if (!photo) {
    body = <p className="text-sm text-slate-500 dark:text-slate-400">{t("noSpeech")}</p>;
  } else {
    return null;
  }

  return (
    <section className="w-full max-w-xl rounded-xl bg-white p-4 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <AutoLabel type={media.mediaType} className="text-xs font-medium text-slate-500 dark:text-slate-400" />
          <LanguageChip media={media} />
        </div>
      {body}
    </section>
  );
}

/** What the caller said / showed, readable at a glance without opening each attachment. */
export function TranscriptList({ media }: { media: IncidentMedia[] }) {
  const t = useTranslations("mediaTranscript");
  const locale = useLocale();
  const items = media.map((m) => ({ m, versions: versionsOf(m, locale) })).filter((x): x is { m: IncidentMedia; versions: NonNullable<ReturnType<typeof versionsOf>> } => x.versions !== null);
  if (items.length === 0) return null;

  const kindLabel = (type: MediaType) => (type === "PHOTO" ? t("kindPhoto") : type === "VIDEO" ? t("kindVideo") : t("kindAudio"));

  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("listHeading")}</p>
      <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-500">{t("listNote")}</p>
      <ul className="space-y-2">
        {items.map(({ m, versions }) => (
          <li key={m.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <KindIcon type={m.mediaType} className="h-3.5 w-3.5" />
              <span>{kindLabel(m.mediaType)}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={m.uploadedAt}>{new Date(m.uploadedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</time>
              <LanguageChip media={m} />
            </div>
            <ExpandableText primary={versions.primary} secondary={versions.secondary} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExpandableText({ primary, secondary }: { primary: Version; secondary: Version | null }) {
  const t = useTranslations("mediaTranscript");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const long = primary.text.length > 180 || primary.text.includes("\n") || secondary !== null;
  return (
    <>
      <TranscriptText text={primary.text} lang={primary.lang} className={expanded || !long ? "" : "line-clamp-3"} />
      {expanded && secondary && (
        <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
          <p className="mb-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">{languageName(secondary.lang, locale)}</p>
          <TranscriptText text={secondary.text} lang={secondary.lang} className="text-slate-600 dark:text-slate-300" />
        </div>
      )}
    </>
  );
}