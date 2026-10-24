package com.najda.backend.user.service;

import com.najda.backend.user.dto.FirebaseSyncReportResponse;
import com.najda.backend.user.dto.UserResponse;
import com.google.firebase.auth.FirebaseAuthException;

public interface FirebaseSyncService {
    FirebaseSyncReportResponse buildReport() throws Exception;
    UserResponse syncFirebaseUser(String uid) throws Exception;
    void syncPostgresUserToFirebase(Long userId) throws FirebaseAuthException;
    void deleteOrphanedFirebaseUser(String uid) throws Exception;
    void deleteOrphanedPostgresUser(Long userId);
}