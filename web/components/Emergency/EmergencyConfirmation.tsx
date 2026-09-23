"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Siren, CircleCheck } from "lucide-react";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function EmergencyConfirmation({ user, setEmergencyStage }: EmergencyConfirmationProps) {
  const t = useTranslations("emergencyConfirmation");

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

  const sending = submitIncident.isPending;

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
  }, []);

  useEffect(() => {
    if (submittedIncidentId !== null) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ selected, description, count, position }));
    } catch {}
  }, [selected, description, count, position, submittedIncidentId]);

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
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("submitError"));
    }
  }

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
        <EmergencyMap onPositionChange={setPosition} />

        {submitError && <p className="text-[14px] leading-5 font-medium text-[#b7102a] text-center">{submitError}</p>}

        <button
          disabled={sending}
          onClick={submit}
          className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-base cursor-pointer font-semibold leading-6 shadow-lg transition-all duration-150 active:scale-[0.98] sm:min-h-16 sm:gap-3 sm:px-8 sm:text-lg sm:leading-7 ${
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
    </aside>
  );
}