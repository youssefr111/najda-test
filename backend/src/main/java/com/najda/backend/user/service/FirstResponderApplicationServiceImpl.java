package com.najda.backend.user.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.service.SupabaseStorageService;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.user.dto.*;
import com.najda.backend.user.model.*;
import com.najda.backend.user.repository.*;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FirstResponderApplicationServiceImpl implements FirstResponderApplicationService {

    private final FirstResponderApplicationRepository applicationRepository;
    private final FirstResponderApplicationDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ResponseUnitRepository responseUnitRepository;
    private final FirebaseClaimsService firebaseClaimsService;
    private final SupabaseStorageService supabaseStorageService;

    public FirstResponderApplicationServiceImpl(
            FirstResponderApplicationRepository applicationRepository,
            FirstResponderApplicationDocumentRepository documentRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            ResponseUnitRepository responseUnitRepository,
            FirebaseClaimsService firebaseClaimsService,
            SupabaseStorageService supabaseStorageService) {
        this.applicationRepository = applicationRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.responseUnitRepository = responseUnitRepository;
        this.firebaseClaimsService = firebaseClaimsService;
        this.supabaseStorageService = supabaseStorageService;
    }

    @Override
    @Transactional
    public FirstResponderApplicationResponse submit(Long citizenId, String motivation, List<MultipartFile> files) throws Exception {
        User citizen = userRepository.findById(citizenId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (citizen.getRole() == null || !"CITIZEN".equalsIgnoreCase(citizen.getRole().getRoleName())) {
            throw new IllegalArgumentException("Only citizen accounts can apply to become a First Responder");
        }

        boolean emailVerified = false;
        try {
            UserRecord firebaseUser = FirebaseAuth.getInstance().getUser(citizen.getFirebaseUid());
            emailVerified = firebaseUser.isEmailVerified();
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not fetch emailVerified status for UID {" + citizen.getFirebaseUid() + "}: " + e.getMessage());
        }

        if (!emailVerified || !citizen.isPhoneVerified()) {
            throw new IllegalArgumentException("Verify your email and phone number from your Account page before applying.");
        }
        boolean hasPending = applicationRepository.findByCitizenIdOrderBySubmittedAtDesc(citizenId).stream()
                .anyMatch(a -> a.getStatus() == ApplicationStatus.PENDING);
        if (hasPending) {
            throw new ConflictException("You already have a pending application.");
        }
        if (motivation == null || motivation.isBlank()) {
            throw new IllegalArgumentException("Please explain why you'd like to become a First Responder");
        }
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("At least one supporting document is required.");
        }

        FirstResponderApplication application = new FirstResponderApplication();
        application.setCitizen(citizen);
        application.setMotivation(motivation);
        application.setStatus(ApplicationStatus.PENDING);
        application.setSubmittedAt(LocalDateTime.now());
        applicationRepository.save(application);

        for (MultipartFile file : files) {
            String extension = file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")
                    ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf('.') + 1)
                    : "bin";
            String path = "applications/" + application.getId() + "/" + java.util.UUID.randomUUID() + "." + extension;
            supabaseStorageService.upload(path, file.getBytes(), file.getContentType());

            FirstResponderApplicationDocument doc = new FirstResponderApplicationDocument();
            doc.setApplication(application);
            doc.setStoragePath(path);
            doc.setOriginalFileName(file.getOriginalFilename());
            documentRepository.save(doc);
        }

        return toResponse(application);
    }

    @Override
    public SupabaseStorageService.SignedUpload createUploadUrl(Long callerId, Long applicationId, String fileExtension) throws Exception {
        FirstResponderApplication application = requireApplication(applicationId);
        if (!application.getCitizen().getId().equals(callerId)) {
            throw new IllegalArgumentException("Only the applicant can attach documents to this application");
        }
        return supabaseStorageService.createSignedUploadUrl("applications/" + applicationId, fileExtension);
    }

    @Override
    @Transactional
    public FirstResponderApplicationResponse addDocument(Long callerId, CreateApplicationDocumentRequest request) throws Exception {
        FirstResponderApplication application = requireApplication(request.applicationId());
        if (!application.getCitizen().getId().equals(callerId)) {
            throw new IllegalArgumentException("Only the applicant can attach documents to this application");
        }
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new ConflictException("This application has already been reviewed -- documents can no longer be added");
        }
        if (!supabaseStorageService.isOwnedPath(request.path())) {
            throw new IllegalArgumentException("This path was not issued by this system's storage");
        }
        if (!supabaseStorageService.objectExists(request.path())) {
            throw new IllegalArgumentException("No file was found at this path -- upload to the signed URL before registering it");
        }

        FirstResponderApplicationDocument doc = new FirstResponderApplicationDocument();
        doc.setApplication(application);
        doc.setStoragePath(request.path());
        doc.setOriginalFileName(request.originalFileName());
        documentRepository.save(doc);

        return toResponse(application);
    }

    @Override
    public List<FirstResponderApplicationResponse> getMine(Long citizenId) {
        return applicationRepository.findByCitizenIdOrderBySubmittedAtDesc(citizenId).stream().map(this::toResponse).toList();
    }

    @Override
    public List<FirstResponderApplicationResponse> getAll(Long callerId) {
        requireAdmin(callerId);
        return applicationRepository.findAllByOrderBySubmittedAtDesc().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public FirstResponderApplicationResponse approve(Long adminId, Long applicationId) {
        requireAdmin(adminId);
        FirstResponderApplication application = requireApplication(applicationId);
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new ConflictException("This application has already been reviewed");
        }

        List<FirstResponderApplicationDocument> documents = documentRepository.findByApplicationId(applicationId);
        if (documents.isEmpty()) {
            throw new ConflictException("This application has no supporting documents attached -- it cannot be approved without at least one.");
        }

        User citizen = application.getCitizen();
        Role firstResponderRole = roleRepository.findByRoleNameIgnoreCase("FIRST_RESPONDER")
                .orElseThrow(() -> new IllegalStateException("FIRST_RESPONDER role missing after role seeding"));
        citizen.setRole(firstResponderRole);
        userRepository.save(citizen);
        firebaseClaimsService.syncRoleClaim(citizen.getFirebaseUid(), "FIRST_RESPONDER");

        // Same convention as AuthServiceImpl.registerEmployee -- every
        // FIRST_RESPONDER account gets a personal, unassigned unit.
        ResponseUnit personalUnit = new ResponseUnit();
        personalUnit.setUnitType(UnitType.FIRST_RESPONDER);
        personalUnit.setStatus(UnitStatus.OFFLINE);
        personalUnit.setAssignedEmployee(citizen);
        responseUnitRepository.save(personalUnit);

        application.setStatus(ApplicationStatus.APPROVED);
        application.setReviewedAt(LocalDateTime.now());
        application.setReviewedBy(adminId);
        return toResponse(applicationRepository.save(application));
    }

    @Override
    @Transactional
    public FirstResponderApplicationResponse reject(Long adminId, Long applicationId, String reason) {
        requireAdmin(adminId);
        FirstResponderApplication application = requireApplication(applicationId);
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new ConflictException("This application has already been reviewed");
        }

        application.setStatus(ApplicationStatus.REJECTED);
        application.setReviewedAt(LocalDateTime.now());
        application.setReviewedBy(adminId);
        application.setReviewNotes(reason);
        return toResponse(applicationRepository.save(application));
    }

    @Override
    @Transactional
    public void deleteDocument(Long adminId, Long documentId) throws Exception {
        requireAdmin(adminId);
        FirstResponderApplicationDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        supabaseStorageService.deleteObject(doc.getStoragePath());
        documentRepository.delete(doc);
    }

    @Override
    public String getDocumentDownloadUrl(Long callerId, Long documentId) throws Exception {
        FirstResponderApplicationDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        FirstResponderApplication application = doc.getApplication();
        boolean isOwner = application.getCitizen().getId().equals(callerId);
        boolean isAdmin = !isOwner && isAdminUser(callerId);
        if (!isOwner && !isAdmin) {
            throw new IllegalArgumentException("You do not have access to this document");
        }

        return supabaseStorageService.createSignedDownloadUrl(doc.getStoragePath());
    }

    private boolean isAdminUser(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getRole() != null && List.of("ADMIN", "SUPER_ADMIN").contains(u.getRole().getRoleName().toUpperCase()))
                .orElse(false);
    }

    private void requireAdmin(Long userId) {
        if (!isAdminUser(userId)) {
            throw new IllegalArgumentException("Only an admin can perform this action");
        }
    }

    private FirstResponderApplication requireApplication(Long id) {
        return applicationRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Application not found"));
    }

    private FirstResponderApplicationResponse toResponse(FirstResponderApplication a) {
        List<FirstResponderApplicationDocumentResponse> docs = documentRepository.findByApplicationId(a.getId()).stream()
                .map(d -> new FirstResponderApplicationDocumentResponse(d.getId(), d.getOriginalFileName()))
                .toList();
        return new FirstResponderApplicationResponse(
                a.getId(), a.getCitizen().getId(), a.getCitizen().getFirstName() + " " + a.getCitizen().getLastName(),
                a.getMotivation(), a.getStatus().name(), a.getSubmittedAt(), a.getReviewedAt(), a.getReviewNotes(), docs);
    }
}