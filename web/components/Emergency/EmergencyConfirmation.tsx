"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { get, set, del } from "idb-keyval";
import { LoaderCircle, Siren, CircleCheck, ArrowLeft } from "lucide-react";
import type { User } from "@/types/user";
import type { IncidentCategory, MediaType } from "@/types/incident";
import { useSubmitIncident } from "@/hooks/incidents/useSubmitIncident";
import { useAttachIncidentMedia } from "@/hooks/incidents/useAttachIncidentMedia";
import IncidentTypeSelector from "./IncidentTypeSelector";
import IncidentDescription from "./IncidentDescription";
import InjuredCounter from "./InjuredCounter";
import MediaAttachment, { Attachment } from "./MediaAttachment";
import EmergencyMap from "./EmergencyMap";

interface EmergencyConfirmationProps {
  user: User | null;
  setEmergencyStage: React.Dispatch<React.SetStateAction<"initial" | "confirmation">>;
}

const EGYPT_BOUNDS = { minLat: 22, maxLat: 31.7, minLng: 24.6, maxLng: 36.9 };
function isWithinEgypt(lat: number, lng: number) {
  return lat >= EGYPT_BOUNDS.minLat && lat <= EGYPT_BOUNDS.maxLat
      && lng >= EGYPT_BOUNDS.minLng && lng <= EGYPT_BOUNDS.maxLng;
}

const CATEGORY_MAP: Record<string, IncidentCategory | undefined> = {
  Medical: "MEDICAL",
  Fire: "FIRE",
  Police: "POLICE",
};

const MEDIA_TYPE_MAP: Record<Attachment["type"], Exclude<MediaType, "TEXT">> = {
  photo: "PHOTO",
  video: "VIDEO",
  audio: "AUDIO",
};

function guessExtension(attachment: Attachment): string {
  const subtype = attachment.blob.type?.split("/")[1]?.split(";")[0];
  if (subtype) return subtype;
  return attachment.type === "photo" ? "jpg" : "webm";
}

const DRAFT_KEY = "najda-emergency-draft";

const ATTACH_KEY = "najda-emergency-attachments";
type StoredAttachment = Omit<Attachment, "url">;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function EmergencyConfirmation({ user, setEmergencyStage }: EmergencyConfirmationProps) {
  const t = useTranslations("emergencyConfirmation");
  const tCommon = useTranslations("common");

  const [selected, setSelected] = useState("Medical");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [position, setPosition] = useState<{
    longitude: number;
    latitude: number;
    source: "GPS" | "MANUAL_PIN";
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const [submittedIncidentId, setSubmittedIncidentId] = useState<number | null>(null);
  

  const submitIncident = useSubmitIncident();
  const attachMedia = useAttachIncidentMedia();

  const [hydrated, setHydrated] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const sending = submitIncident.isPending;

  useEffect(() => {
    let cancelled = false;
    get<StoredAttachment[]>(ATTACH_KEY)
      .then((saved) => {
        if (!cancelled && saved?.length) {
          setAttachments(saved.map((a) => ({ ...a, url: URL.createObjectURL(a.blob) })));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || submittedIncidentId !== null) return;
    if (attachments.length === 0) del(ATTACH_KEY).catch(() => {});
    else
      set(
        ATTACH_KEY,
        attachments.map(({ id, type, blob, durationSec }) => ({ id, type, blob, durationSec }))
      ).catch(() => {});
  }, [attachments, hydrated, submittedIncidentId]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected(draft.selected ?? "Medical");
        setDescription(draft.description ?? "");
        setCount(draft.count ?? 0);
        setPosition(draft.position ?? null);
      }
    } catch {}
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated || submittedIncidentId !== null) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ selected, description, count, position })
      );
    } catch {}
  }, [selected, description, count, position, submittedIncidentId, draftHydrated]);

  async function submit() {
    if (sending) return;
    setSubmitError(null);
    setMediaWarning(null);

    const category = CATEGORY_MAP[selected];
    if (!category) {
      setSubmitError(t("otherNotSupported"));
      return;
    }
    if (!position) {
      setSubmitError(t("locationRequired"));
      return;
    }
    if (!isWithinEgypt(position.latitude, position.longitude)) {
      setSubmitError(t("locationOutsideEgypt"));
      return;
    }

    try {
      const incident = await submitIncident.mutateAsync({
        category,
        textMessage: description.trim() || null,
        injuredCount: count,
        latitude: position.latitude,
        longitude: position.longitude,
        locationSource: position.source,
      });

      if (attachments.length > 0) {
        const results = await Promise.allSettled(
          attachments.map(async (a) => {
            const file = new File([a.blob], `${a.id}.${guessExtension(a)}`, { type: a.blob.type });
            await attachMedia.mutateAsync({ incidentId: incident.id, mediaType: MEDIA_TYPE_MAP[a.type], file });
          })
        );
        const failedCount = results.filter((r) => r.status === "rejected").length;
        if (failedCount > 0) {
          setMediaWarning(t("mediaWarning", { failedCount, totalCount: attachments.length }));
        }
      }

      setSubmittedIncidentId(incident.id);
      sessionStorage.removeItem(DRAFT_KEY);
      del(ATTACH_KEY).catch(() => {});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("submitError"));
    }
  }

  if (!draftHydrated) return null;

  if (submittedIncidentId !== null) {
    return (
      <aside className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
        <CircleCheck className="h-16 w-16 text-[#166534]" />
        <div>
          <h2 className="text-xl font-bold text-[#191c1d] dark:text-[#f3f4f5]">{t("alertSent")}</h2>
          <p className="mt-1 text-sm text-[#5b403f] dark:text-[#c9b8b6]">
            {t("submittedToDispatch", { id: submittedIncidentId })}
          </p>
          {mediaWarning && <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{mediaWarning}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEmergencyStage("initial")}
          className="mt-2 px-6 py-3 rounded-full bg-[#b7102a] text-white font-semibold hover:bg-[#a20e25] transition-colors cursor-pointer"
        >
          {t("done")}
        </button>
      </aside>
    );
  }

  return (
    <aside>
      <div className="space-y-6">
        <IncidentTypeSelector selected={selected} onSelect={setSelected} />
        <IncidentDescription value={description} onChange={setDescription} />
        <InjuredCounter count={count} onChange={setCount} />
        <MediaAttachment attachments={attachments} setAttachments={setAttachments} />
        <EmergencyMap
          initialPosition={position}
          onPositionChange={setPosition}
        />

        {submitError && <p className="text-[14px] leading-5 font-medium text-[#b7102a] text-center">{submitError}</p>}
        
        <div className="flex gap-3 sm:flex-row" dir="ltr">
          <button
            type="button"
            onClick={() => setEmergencyStage("initial")}
            disabled={sending}
            aria-label={tCommon("back")}
            title={tCommon("back")}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full cursor-pointer bg-[#edeeef] text-[#191c1d] shadow-lg transition-all duration-150 hover:bg-[#e1e3e4] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#242426] dark:text-[#f3f4f5] dark:hover:bg-[#2f2f31] sm:h-16 sm:w-16"
          >
            <ArrowLeft className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" strokeWidth={2.5} />
          </button>

          <button
            type="button"
            disabled={sending}
            onClick={submit}
            className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-base cursor-pointer font-semibold leading-6 shadow-lg transition-all duration-150 active:scale-[0.98] sm:min-h-16 sm:gap-3 sm:px-8 sm:text-lg sm:leading-7 ${
              sending ? "cursor-not-allowed bg-[#485f84] text-white" : "bg-[#b7102a] text-white hover:bg-[#a20e25] active:bg-[#92001c]"
            }`}
          >
            {sending ? (
              <>
                <LoaderCircle className="h-5 w-5 shrink-0 animate-spin sm:h-6 sm:w-6" strokeWidth={2.5} />
                {t("submitting")}
              </>
            ) : (
              <>
                <Siren className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" strokeWidth={2.5} />
                {t("submitAlert")}
              </>
            )}
          </button>
        </div>

      </div>
    </aside>
  );
}