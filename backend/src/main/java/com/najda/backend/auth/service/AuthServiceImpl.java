package com.najda.backend.auth.service;

import com.google.firebase.ErrorCode;
import com.google.firebase.auth.AuthErrorCode;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.auth.dto.EmployeeRegistrationResponse;
import com.najda.backend.auth.dto.RegisterCitizenRequest;
import com.najda.backend.auth.dto.RegisterCitizenWithPasswordRequest;
import com.najda.backend.auth.dto.RegisterEmployeeRequest;
import com.najda.backend.auth.util.EmailAddresses;
import com.najda.backend.exceptions.PhoneAlreadyInUseException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.exceptions.EmailAlreadyRegisteredException;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.facility.service.FacilityService;
import com.najda.backend.security.util.TemporaryPasswordGenerator;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.unit.service.RoleFacilityPolicy;
import com.najda.backend.user.dto.UserResponse;
import com.najda.backend.user.mapper.UserMapper;
import com.najda.backend.user.model.Role;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.RoleRepository;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.user.service.FirebaseClaimsService;
import com.najda.backend.user.service.ProfileCompletionEvaluator;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String CITIZEN_ROLE = "CITIZEN";
    private static final String PASSWORD_REJECTED = "Password does not meet the security requirements.";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FirebaseClaimsService firebaseClaimsService;
    private final UserMapper userMapper;
    private final ResponseUnitRepository responseUnitRepository;
    private final FacilityRepository facilityRepository;
    private final FacilityService facilityService;
    private final TemporaryPasswordGenerator temporaryPasswordGenerator;
    private final ProfileCompletionEvaluator profileCompletionEvaluator;
    private final EmailVerificationService emailVerificationService;
    private final EmailAvailabilityService emailAvailabilityService;
    private final TransactionTemplate transactionTemplate;

    // ------------------------------------------------------------------
    // Citizen: existing Firebase identity (Google / phone)
    // ------------------------------------------------------------------

    @Override
    public ResponseEntity<?> registerCitizen(String firebaseUid, String provider, RegisterCitizenRequest request) {
        if (userRepository.findByFirebaseUid(firebaseUid).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "This account is already registered"));
        }

        User user = newCitizen(firebaseUid, request.firstName(), request.lastName(), request.email(), requireCitizenRole());
        user.setPhone(request.phone());
        user.setAddress(request.address());
        user.setGender(request.gender());
        recomputeProfileCompleted(user);

        userRepository.save(user);
        firebaseClaimsService.syncRoleClaim(firebaseUid, CITIZEN_ROLE);

        return ResponseEntity.status(201).body(userMapper.toResponse(user));
    }

    // ------------------------------------------------------------------
    // Citizen: email + password, gated by OTP verification
    // ------------------------------------------------------------------

    /**
     * Email + password registration. Nothing exists in either store until the email is
     * verified: check proof -> create Firebase user (already email-verified) -> save the DB
     * row and consume the verification in ONE transaction -> on failure, delete the Firebase user.
     * The profile is complete on creation (phone, address, gender and password are all provided).
     */
    @Override
    public UserResponse registerCitizenWithPassword(RegisterCitizenWithPasswordRequest request) {
        String email = EmailAddresses.normalize(request.email());
        String firstName = request.firstName().trim();
        String lastName = request.lastName().trim();
        String phone = request.phone().trim();

        emailVerificationService.requireVerified(email, request.verificationToken());
        if (emailAvailabilityService.isTaken(email)) {
            throw new EmailAlreadyRegisteredException();
        }
        // Same rule as setUnverifiedPhone: a phone already verified elsewhere can't be claimed.
        // Checked before touching Firebase so a rejection never leaves anything to clean up.
        if (userRepository.existsByPhoneAndPhoneVerifiedTrue(phone)) {
            throw new PhoneAlreadyInUseException();
        }

        Role citizenRole = requireCitizenRole();
        UserRecord firebaseUser = createVerifiedFirebaseUser(email, firstName, lastName, request.password());

        User user = newCitizen(firebaseUser.getUid(), firstName, lastName, email, citizenRole);
        user.setPhone(phone);
        user.setAddress(request.address().trim());
        user.setGender(request.gender());
        recomputeProfileCompleted(user); // Firebase lookup happens here, before the DB transaction opens

        User saved = persistCitizen(user, email);
        firebaseClaimsService.syncRoleClaim(saved.getFirebaseUid(), CITIZEN_ROLE);
        return userMapper.toResponse(saved);
    }

    private User persistCitizen(User user, String email) {
        try {
            return transactionTemplate.execute(status -> {
                User saved = userRepository.saveAndFlush(user);
                emailVerificationService.consume(email);
                return saved;
            });
        } catch (RuntimeException e) {
            deleteFirebaseUserQuietly(user.getFirebaseUid());
            if (e instanceof DataIntegrityViolationException) {
                throw new EmailAlreadyRegisteredException();
            }
            throw e;
        }
    }

    private UserRecord createVerifiedFirebaseUser(String email, String firstName, String lastName, String password) {
        UserRecord.CreateRequest createRequest = new UserRecord.CreateRequest()
                .setEmail(email)
                .setEmailVerified(true)
                .setPassword(password)
                .setDisplayName(firstName + " " + lastName);
        try {
            return FirebaseAuth.getInstance().createUser(createRequest);
        } catch (FirebaseAuthException e) {
            if (e.getAuthErrorCode() == AuthErrorCode.EMAIL_ALREADY_EXISTS) {
                throw new EmailAlreadyRegisteredException();
            }
            if (e.getErrorCode() == ErrorCode.INVALID_ARGUMENT) {
                boolean passwordPolicy = String.valueOf(e.getMessage()).contains("PASSWORD_DOES_NOT_MEET_REQUIREMENTS");
                throw new IllegalArgumentException(passwordPolicy ? PASSWORD_REJECTED : "The provided account details were rejected.");
            }
            throw new IllegalStateException("Could not create the Firebase account", e);
        }
    }

    // ------------------------------------------------------------------
    // Employee: admin-provisioned
    // ------------------------------------------------------------------

    @Override
    public ResponseEntity<?> registerEmployee(RegisterEmployeeRequest request) {
        // Caller must already be ADMIN or SUPER_ADMIN --
        // enforced at the controller via @PreAuthorize.

        Role role = roleRepository.findByRoleNameIgnoreCase(request.roleName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Role not found: " + request.roleName()));

        Facility facility = null;
        String roleName = role.getRoleName();

        if (RoleFacilityPolicy.allowsFacility(roleName)) {
            if (request.facilityId() != null) {
                facilityService.requireFacilityOfType(request.facilityId(), RoleFacilityPolicy.expectedTypes(roleName).toArray(new FacilityType[0]));

                facility = facilityRepository.findById(request.facilityId())
                        .orElseThrow(() -> new ResourceNotFoundException("Facility not found"));
                facilityService.markRegistered(request.facilityId());
            } else if (RoleFacilityPolicy.requiresFacility(roleName)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "A " + RoleFacilityPolicy.expectedTypes(roleName).iterator().next() + " facility must be selected for a " + roleName + " account"));
            }
        } else if (request.facilityId() != null) {
            return ResponseEntity.badRequest().body(Map.of("error", roleName + " accounts cannot be linked to a facility"));
        }

        // Same restriction as role updates: only a SUPER_ADMIN can create
        // another SUPER_ADMIN account.
        if (role.getRoleName().equalsIgnoreCase("SUPER_ADMIN")) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            User caller = (User) auth.getPrincipal();
            boolean callerIsSuperAdmin = caller.getRole() != null
                    && caller.getRole().getRoleName().equalsIgnoreCase("SUPER_ADMIN");
            if (!callerIsSuperAdmin) {
                throw new AccessDeniedException("Only a SUPER_ADMIN can create another SUPER_ADMIN account");
            }
        }

        // Temporary password: the employee never actually uses this --
        // generatePasswordResetLink below sends them straight to setting
        // their own password. It only exists because Firebase's createUser
        // requires *some* password to be set -- and it must satisfy this
        // project's enforced Password Policy (Authentication -> Settings ->
        // Password Policy), which a plain UUID string does not.
        String temporaryPassword = temporaryPasswordGenerator.generate();

        UserRecord.CreateRequest createRequest = new UserRecord.CreateRequest()
                .setEmail(request.email())
                .setPassword(temporaryPassword)
                .setDisplayName(request.firstName() + " " + request.lastName());

        UserRecord firebaseUser;
        try {
            firebaseUser = FirebaseAuth.getInstance().createUser(createRequest);
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of(
                    "error", "Could not create Firebase account: " + e.getMessage()));
        }

        try {
            User user = new User();
            user.setFirebaseUid(firebaseUser.getUid());
            user.setFirstName(request.firstName());
            user.setLastName(request.lastName());
            user.setEmail(request.email());
            user.setPhone(request.phone());
            user.setAddress(request.address());
            user.setGender(request.gender());
            user.setRole(role);
            user.setFacility(facility); // Set the facility for employee accounts, null otherwise

            recomputeProfileCompleted(user);

            userRepository.save(user);
            firebaseClaimsService.syncRoleClaim(firebaseUser.getUid(), role.getRoleName());

            if (role.getRoleName().equalsIgnoreCase("FIRST_RESPONDER")) {
                ResponseUnit personalUnit = new ResponseUnit();
                personalUnit.setUnitType(UnitType.FIRST_RESPONDER);
                personalUnit.setStatus(UnitStatus.OFFLINE);
                personalUnit.setOwner(user);
                // plateNumber and facility intentionally left null
                responseUnitRepository.save(personalUnit);
            }

            String resetLink = FirebaseAuth.getInstance().generatePasswordResetLink(request.email());

            return ResponseEntity.status(201)
                    .body(new EmployeeRegistrationResponse(userMapper.toResponse(user), resetLink));

        } catch (Exception e) {
            // Roll back the Firebase account so we don't leave an orphaned
            // credential with no matching User row.
            deleteFirebaseUserQuietly(firebaseUser.getUid());
            throw new RuntimeException(e);
        }
    }

    // ------------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------------

    private Role requireCitizenRole() {
        return roleRepository.findByRoleNameIgnoreCase(CITIZEN_ROLE)
                .orElseThrow(() -> new ResourceNotFoundException("CITIZEN role not found -- has the roles table been seeded?"));
    }

    private static User newCitizen(String firebaseUid, String firstName, String lastName, String email, Role role) {
        User user = new User();
        user.setFirebaseUid(firebaseUid);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(email);
        user.setPhoneVerified(false);
        user.setRole(role);
        return user;
    }

    private void recomputeProfileCompleted(User user) {
        user.setProfileCompleted(profileCompletionEvaluator.isComplete(user));
    }

    private void deleteFirebaseUserQuietly(String firebaseUid) {
        try {
            FirebaseAuth.getInstance().deleteUser(firebaseUid);
        } catch (Exception cleanupFailure) {
            log.error("Orphaned Firebase account {} needs manual cleanup: {}", firebaseUid, cleanupFailure.getMessage());
        }
    }
}