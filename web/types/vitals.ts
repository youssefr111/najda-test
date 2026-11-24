import type { HospitalTransfer } from "@/types/hospitalTransfer";

export type ConsciousnessLevel = "ALERT" | "VERBAL" | "PAIN" | "UNRESPONSIVE";

export interface VitalsUpdate {
  id: number;
  heartRate: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  temperatureCelsius: number | null;
  consciousnessLevel: ConsciousnessLevel | null;
  notes: string | null;
  recordedAt: string;
}

/** One ambulance's patient transfer on an incident, with every reading its crew has sent (newest first). */
export interface IncidentTransferVitals {
  hospitalTransferId: number;
  destinationName: string | null;
  unitPlateNumber: string | null;
  status: HospitalTransfer["status"];
  updates: VitalsUpdate[];
}
