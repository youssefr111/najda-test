package com.najda.backend.user.service;

import com.najda.backend.incident.service.SupabaseStorageService;
import com.najda.backend.user.dto.*;
import java.util.List;

import org.springframework.web.multipart.MultipartFile;

public interface FirstResponderApplicationService {
    FirstResponderApplicationResponse submit(Long citizenId, String motivation, List<MultipartFile> files) throws Exception;
    SupabaseStorageService.SignedUpload createUploadUrl(Long callerId, Long applicationId, String fileExtension) throws Exception;
    FirstResponderApplicationResponse addDocument(Long callerId, CreateApplicationDocumentRequest request) throws Exception;
    List<FirstResponderApplicationResponse> getMine(Long citizenId);
    List<FirstResponderApplicationResponse> getAll(Long callerId);
    FirstResponderApplicationResponse approve(Long adminId, Long applicationId);
    FirstResponderApplicationResponse reject(Long adminId, Long applicationId, String reason);
    String getDocumentDownloadUrl(Long callerId, Long documentId) throws Exception;
    void deleteDocument(Long adminId, Long documentId) throws Exception;
}