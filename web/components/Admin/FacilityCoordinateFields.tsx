"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useIncidentLocationConfig } from "@/hooks/incidents/useIncidentLocationConfig";
import { isWithinBoundary } from "@/lib/geo/location";
import { roundCoordinate, type GeoPoint } from "./FacilityLocationPicker";

type FieldsStatus = "ok" | "incomplete" | "invalid" | "outsideEgypt";

interface FacilityCoordinateFieldsProps {
  /** The pin. Typing valid coordinates moves it; moving it (map click, reset) rewrites the fields. */
  value: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
  /** False while the fields hold something that isn't a usable location, so the form can refuse to save meanwhile. */
  onValidityChange: (valid: boolean) => void;
}

const INPUT =
  "px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm aria-invalid:border-red-500 dark:aria-invalid:border-red-500";

// Accept a decimal comma, which is how many keyboards in the region type it.
const toNumber = (text: string) => (text.trim() === "" ? NaN : Number(text.trim().replace(",", ".")));

/** For an admin who already has the coordinates: type them instead of hunting for the spot on the map. */
export default function FacilityCoordinateFields({ value, onChange, onValidityChange }: FacilityCoordinateFieldsProps) {
  const t = useTranslations("admin.facilities.form");
  const { data: config } = useIncidentLocationConfig();
  const [latitude, setLatitude] = useState(value ? String(value.latitude) : "");
  const [longitude, setLongitude] = useState(value ? String(value.longitude) : "");
  const [status, setStatus] = useState<FieldsStatus>("ok");

  // The pin moved some other way: show where it is -- unless the fields already say so, so half-typed input like
  // "30." isn't rewritten under the admin's fingers.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value && (toNumber(latitude) !== value.latitude || toNumber(longitude) !== value.longitude)) {
      setLatitude(String(value.latitude));
      setLongitude(String(value.longitude));
    }
    setStatus("ok");
  }

  useEffect(() => onValidityChange(status === "ok"), [status, onValidityChange]);

  function handleChange(nextLatitude: string, nextLongitude: string) {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);

    const lat = toNumber(nextLatitude);
    const lng = toNumber(nextLongitude);
    if (nextLatitude.trim() === "" || nextLongitude.trim() === "") return setStatus("incomplete");
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return setStatus("invalid");
    if (!isWithinBoundary(config?.boundary, lat, lng)) return setStatus("outsideEgypt");

    setStatus("ok");
    onChange({ latitude: roundCoordinate(lat), longitude: roundCoordinate(lng) });
  }

  const showError = status === "invalid" || status === "outsideEgypt";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-3" dir="ltr">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t("latitude")}</span>
          <input
            value={latitude}
            onChange={(e) => handleChange(e.target.value, longitude)}
            inputMode="decimal"
            placeholder="30.0444"
            aria-invalid={showError}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t("longitude")}</span>
          <input
            value={longitude}
            onChange={(e) => handleChange(latitude, e.target.value)}
            inputMode="decimal"
            placeholder="31.2357"
            aria-invalid={showError}
            className={INPUT}
          />
        </label>
      </div>
      {showError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {status === "outsideEgypt" ? t("outsideEgypt") : t("invalidCoordinates")}
        </p>
      )}
    </div>
  );
}
