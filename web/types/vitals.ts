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