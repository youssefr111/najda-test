package com.najda.backend.user.dto;
import java.util.List;

public record FirebaseSyncReportResponse(List<OrphanedFirebaseUserResponse> orphanedFirebaseUsers, List<OrphanedPostgresUserResponse> orphanedPostgresUsers) {}