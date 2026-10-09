package com.najda.backend.user.service;

import com.najda.backend.user.dto.FirebaseSyncReportResponse;
import com.najda.backend.user.dto.UserResponse;

public interface FirebaseSyncService {
    FirebaseSyncReportResponse buildReport() throws Exception;
    UserResponse syncFirebaseUser(String uid) throws Exception;
    void deleteOrphanedFirebaseUser(String uid) throws Exception;
    void deleteOrphanedPostgresUser(Long userId);
}