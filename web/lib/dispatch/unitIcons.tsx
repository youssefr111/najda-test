import { Ambulance, Flame, Shield, UserRound } from "lucide-react";
import type { UnitType } from "@/types/unit";

export function UnitIcon({ unitType, size = 13 }: { unitType: UnitType; size?: number }) {
  const props = { size, className: "text-white" };
  switch (unitType) {
    case "AMBULANCE": return <Ambulance {...props} />;
    case "FIRE_TRUCK": return <Flame {...props} />;
    case "POLICE_CAR": return <Shield {...props} />;
    case "FIRST_RESPONDER": return <UserRound {...props} />;
  }
}