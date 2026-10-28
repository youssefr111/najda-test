export type RoleInShift = "LEAD" | "CREW";

export interface ShiftAssignmentResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  unitId: number;
  unitPlateNumber: string;
  roleInShift: RoleInShift;
  startTime: string;
}