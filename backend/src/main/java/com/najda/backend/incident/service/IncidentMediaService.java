package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.CreateIncidentMediaRequest;
import com.najda.backend.incident.model.IncidentMedia;

public interface IncidentMediaService {
    SupabaseStorageService.SignedUpload createUploadUrl(Long callerId, Long incidentId, String fileExtension) throws Exception;
    IncidentMedia createMedia(Long callerId, CreateIncidentMediaRequest request) throws Exception;
    IncidentMedia editTextMessage(Long callerId, Long mediaId, String newContent);
    void deleteMedia(Long callerId, Long mediaId) throws Exception;
    String getDownloadUrl(Long callerId, Long mediaId) throws Exception;
}