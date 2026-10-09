import { Hospital, Ambulance, Flame, ShieldAlert } from "lucide-react";
import type { FacilityType } from "@/types/facility";

const FACILITY_ICONS: Record<FacilityType, React.ComponentType<{ size?: number; className?: string }>> = {
  HOSPITAL: Hospital,
  AMBULANCE_STATION: Ambulance,
  FIRE_STATION: Flame,
  POLICE_STATION: ShieldAlert,
};

export const FACILITY_COLORS: Record<FacilityType, string> = {
  HOSPITAL: "#dc2626",
  AMBULANCE_STATION: "#ea580c",
  FIRE_STATION: "#f59e0b",
  POLICE_STATION: "#2563eb",
};

export function FacilityIcon({ facilityType, size = 14, className }: { facilityType: FacilityType; size?: number; className?: string }) {
  const Icon = FACILITY_ICONS[facilityType];
  return <Icon size={size} className={className} />;
}