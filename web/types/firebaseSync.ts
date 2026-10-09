export interface OrphanedFirebaseUser { uid: string; email: string | null; }
export interface OrphanedPostgresUser { id: number; email: string; firebaseUid: string; }
export interface FirebaseSyncReport {
  orphanedFirebaseUsers: OrphanedFirebaseUser[];
  orphanedPostgresUsers: OrphanedPostgresUser[];
}