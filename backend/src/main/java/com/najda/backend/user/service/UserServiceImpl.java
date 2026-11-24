package com.najda.backend.user.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.auth.AuthErrorCode;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.facility.service.FacilityService;
import com.najda.backend.unit.service.RoleFacilityPolicy;
import com.najda.backend.user.dto.*;
import com.najda.backend.user.mapper.UserMapper;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.audit.model.AuditLog;
import com.najda.backend.audit.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import java.util.Map;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final AuditLogRepository auditLogRepository;
    private final FacilityRepository facilityRepository;
    private final FacilityService facilityService;
    private final ProfileCompletionEvaluator profileCompletionEvaluator;
    private final UserEventPublisher userEventPublisher;

    public UserServiceImpl(UserRepository userRepository, UserMapper userMapper, AuditLogRepository auditLogRepository, FacilityRepository facilityRepository, FacilityService facilityService, ProfileCompletionEvaluator profileCompletionEvaluator, UserEventPublisher userEventPublisher) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.auditLogRepository = auditLogRepository;
        this.facilityRepository = facilityRepository;
        this.facilityService = facilityService;
        this.profileCompletionEvaluator = profileCompletionEvaluator;
        this.userEventPublisher = userEventPublisher;
    }

    @Override
    public Page<UserResponse> getAllUsers(String roleName, Boolean enabled, String search, Pageable pageable) {
        if (search != null) {
            search = search.toLowerCase();
        }

        Page<User> page = userRepository.search(roleName, enabled, search, pageable);
        List<UserResponse> responses = userMapper.toResponses(page.getContent());

        return new org.springframework.data.domain.PageImpl<>(responses, pageable, page.getTotalElements());
    }

    @SuppressWarnings("null")
    @Override
    @Transactional
    public User completeProfile(Long userId, CompleteProfileRequest request) {
        // One transaction, one row lock, one save: no other request can interleave, and the
        // completion flag is computed once from the final state.
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setGender(request.gender());
        if (request.addressDetails() == null) {
            throw new IllegalArgumentException("An address is required");
        }
        AddressSupport.apply(user, request.addressDetails());

        String phone = request.phone();
        boolean changesPhone = phone != null && !phone.isBlank()
                && !(user.isPhoneVerified() && phone.equals(user.getPhone()));
        if (changesPhone) {
            if (userRepository.existsByPhoneAndPhoneVerifiedTrue(phone) && !phone.equals(user.getPhone())) {
                throw new IllegalArgumentException("This phone number is already verified on another account.");
            }
            // A Firebase phone credential only exists once the number was verified, so a brand-new
            // account (the usual case here) needs no Firebase round trip at all.
            if (user.isPhoneVerified()) {
                try {
                    unlinkFirebasePhoneIfPresent(user);
                } catch (FirebaseAuthException e) {
                    throw new IllegalStateException("Failed to unlink the existing Firebase phone number", e);
                }
            }
            user.setPhone(phone);
            user.setPhoneVerified(false);
        }

        user.setProfileCompleted(profileCompletionEvaluator.isComplete(user));
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateProfile(Long userId, UpdateProfileRequest request) throws FirebaseAuthException {
        User targetUser = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User caller = (User) auth.getPrincipal();

        boolean isSelf = caller.getId().equals(targetUser.getId());
        boolean callerIsSuperAdmin = caller.getRole() != null
                && caller.getRole().getRoleName().equalsIgnoreCase("SUPER_ADMIN");
        boolean targetIsSuperAdmin = targetUser.getRole() != null
                && targetUser.getRole().getRoleName().equalsIgnoreCase("SUPER_ADMIN");

        // Consistent with the role/enable rules: a plain ADMIN cannot modify a
        // SUPER_ADMIN account at all -- including their profile fields --
        // unless they're editing their own account.
        if (targetIsSuperAdmin && !isSelf && !callerIsSuperAdmin) {
            throw new AccessDeniedException("Admins cannot modify a SUPER_ADMIN account");
        }

        if (request.firstName() != null && !request.firstName().isBlank()) {
            targetUser.setFirstName(request.firstName());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            targetUser.setLastName(request.lastName());
        }
        if (request.gender() != null) {
            targetUser.setGender(request.gender());
        }

        AddressSupport.apply(targetUser, request.addressDetails());

        targetUser.setProfileCompleted(profileCompletionEvaluator.isComplete(targetUser));

        return userRepository.save(targetUser);
    }

    /** Disabling or re-enabling staff can leave their facility without anyone to receive its work, or give it someone. */
    private void refreshRegistrationOf(User user) {
        if (user.getFacility() != null) facilityService.refreshRegistered(user.getFacility().getId());
    }

    @Override
    public User updateFacility(Long userId, Long facilityId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String roleName = user.getRole() != null ? user.getRole().getRoleName() : null;
        if (roleName == null || !RoleFacilityPolicy.allowsFacility(roleName)) {
            throw new IllegalArgumentException("This role cannot be linked to a facility");
        }
        Long previousFacilityId = user.getFacility() != null ? user.getFacility().getId() : null;

        if (facilityId == null) {
            if (RoleFacilityPolicy.requiresFacility(roleName)) {
                throw new IllegalArgumentException(roleName + " accounts must always have a facility -- unassign by changing their role instead");
            }
            user.setFacility(null);
        } else {
            facilityService.requireFacilityOfType(facilityId, RoleFacilityPolicy.expectedTypes(roleName).toArray(new FacilityType[0]));
            Facility facility = facilityRepository.findById(facilityId)
                    .orElseThrow(() -> new ResourceNotFoundException("Facility not found"));
            user.setFacility(facility);
        }

        User saved = userRepository.save(user);
        // This may have been the last link to the old facility, and the first to the new one.
        facilityService.refreshRegistered(previousFacilityId);
        facilityService.refreshRegistered(facilityId);
        return saved;
    }

    @Override
    public User syncVerifiedEmail(Long userId, String currentFirebaseEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setEmail(currentFirebaseEmail);
        return userRepository.save(user);
    }

    @Override
    public User adminOverrideEmail(Long userId, String newEmail) throws FirebaseAuthException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserRecord.UpdateRequest updateRequest =
                new UserRecord.UpdateRequest(user.getFirebaseUid()).setEmail(newEmail);
        FirebaseAuth.getInstance().updateUser(updateRequest); // still resets emailVerified to false

        user.setEmail(newEmail);
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User setUnverifiedPhone(Long userId, String phone) {
        User user = userRepository.findByIdForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.isPhoneVerified() && phone.equals(user.getPhone())) {
            throw new IllegalArgumentException("New phone number must be different from your current verified phone number");
        }
        
        boolean claimedByAnotherVerifiedAccount = userRepository.existsByPhoneAndPhoneVerifiedTrue(phone)
                && !phone.equals(user.getPhone());
        if (claimedByAnotherVerifiedAccount) {
            throw new IllegalArgumentException("This phone number is already verified on another account.");
        }

        // Unlink the old phone from Firebase so it stops being a valid credential
        // and the new number can be linked cleanly after OTP verification.
        try {
            unlinkFirebasePhoneIfPresent(user);
        } catch (FirebaseAuthException e) {
            throw new IllegalStateException("Failed to unlink the existing Firebase phone number", e);
        }

        user.setPhone(phone);
        user.setPhoneVerified(false);
        user.setProfileCompleted(profileCompletionEvaluator.isComplete(user));
        return userRepository.save(user);
    }

    @Override
    public User syncVerifiedPhone(Long userId, String verifiedPhone) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean claimedByAnotherVerifiedAccount = userRepository.existsByPhoneAndPhoneVerifiedTrue(verifiedPhone)
                && !verifiedPhone.equals(user.getPhone());
        if (claimedByAnotherVerifiedAccount) {
            throw new IllegalArgumentException("This phone number is already verified on another account.");
        }

        user.setPhone(verifiedPhone);
        user.setPhoneVerified(true);
        user.setProfileCompleted(profileCompletionEvaluator.isComplete(user));
        return userRepository.save(user);
    }

    @Override
    public User adminOverridePhone(Long userId, String newPhone) throws FirebaseAuthException {
        if (newPhone == null || newPhone.isBlank()) {
            throw new IllegalArgumentException("Phone number cannot be empty");
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String previousPhone = targetUser.getPhone();

        if (newPhone.equals(previousPhone)) {
            throw new IllegalArgumentException("New phone number must be different from the current phone number");
        }

        boolean claimedByAnotherVerifiedAccount = userRepository.existsByPhoneAndPhoneVerifiedTrue(newPhone);
        if (claimedByAnotherVerifiedAccount) {
            throw new IllegalArgumentException("This phone number is already verified on another account.");
        }

        // Firebase has no "phone set but unverified" state -- a phone number
        // present on the record IS a working sign-in credential. Unlinking it
        // is the only way to make phoneVerified=false true on the Firebase
        // side too. Safe to do unconditionally here since phone is never a
        // user's sole sign-in method (email/Google only) -- if that ever
        // changes, this needs a guard against removing someone's only credential.
        unlinkFirebasePhoneIfPresent(targetUser);

        targetUser.setPhone(newPhone);
        targetUser.setPhoneVerified(false);
        targetUser.setProfileCompleted(profileCompletionEvaluator.isComplete(targetUser));
        userRepository.save(targetUser);

        writeAuditLog(targetUser.getId(), previousPhone, newPhone);

        return targetUser;
    }

    @Override
    @Transactional(rollbackFor = FirebaseAuthException.class)
    public User adminSetPhoneVerified(User actor, Long userId, boolean verified, String note) throws FirebaseAuthException {
        User target = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (verified) {
            if (target.getPhone() == null || target.getPhone().isBlank()) {
                throw new IllegalArgumentException("This user has no phone number to verify");
            }
            if (!target.isPhoneVerified() && userRepository.existsByPhoneAndPhoneVerifiedTrue(target.getPhone())) {
                throw new IllegalArgumentException("This phone number is already verified on another account.");
            }
        }

        // DB writes first; the Firebase call goes last so that if it fails, the
        // exception rolls the DB changes back and the two stay in sync.
        target.setPhoneVerified(verified);
        target.setProfileCompleted(profileCompletionEvaluator.isComplete(target));
        userRepository.save(target);

        AuditLog log = new AuditLog();
        log.setActorUserId(actor.getId());
        log.setAction("ADMIN_PHONE_VERIFICATION_OVERRIDE");
        log.setTargetUserId(target.getId());
        log.setDetails("Phone '" + target.getPhone() + "' set to " + (verified ? "verified" : "unverified")
                + " by an administrator (no OTP)" + (note == null || note.isBlank() ? "" : ": " + note.trim()));
        auditLogRepository.save(log);

        if (verified) {
            linkFirebasePhone(target);
        } else {
            unlinkFirebasePhoneIfPresent(target);
        }

        userEventPublisher.notifyUsersChanged();

        return target;
    }

    private void linkFirebasePhone(User user) throws FirebaseAuthException {
        UserRecord firebaseUser = FirebaseAuth.getInstance().getUser(user.getFirebaseUid());

        // Already attached in Firebase -- nothing to do.
        if (user.getPhone().equals(firebaseUser.getPhoneNumber())) {
            return;
        }

        try {
            // Setting the phone number on the record adds the "phone" provider,
            // which is Firebase's equivalent of "verified". Replaces any different
            // number currently on the record.
            FirebaseAuth.getInstance().updateUser(
                    new UserRecord.UpdateRequest(user.getFirebaseUid()).setPhoneNumber(user.getPhone()));
        } catch (FirebaseAuthException e) {
            if (e.getAuthErrorCode() == AuthErrorCode.PHONE_NUMBER_ALREADY_EXISTS) {
                throw new IllegalArgumentException("This phone number is already linked to another Firebase account.");
            }
            throw e;
        }
    }

    @Override
    public ResponseEntity<?> resendPasswordReset(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "User does not exist"));
        }
        if (user.getEmail() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User has no email on file"));
        }

        try {
            UserRecord firebaseUser = FirebaseAuth.getInstance().getUser(user.getFirebaseUid());

            boolean hasPasswordProvider = java.util.Arrays.stream(firebaseUser.getProviderData())
                    .anyMatch(provider -> "password".equals(provider.getProviderId()));

            if (!hasPasswordProvider) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "This account doesn't use a password to sign in (e.g. Google or phone-based sign-in) -- password reset isn't applicable."));
            }

            String resetLink = FirebaseAuth.getInstance().generatePasswordResetLink(user.getEmail());
            return ResponseEntity.ok(Map.of("passwordResetLink", resetLink));

        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    @Override
    public ResponseEntity<?> disableUser(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "User does not exist"));
        }

        boolean targetIsSuperAdmin = user.getRole() != null
                && user.getRole().getRoleName().equalsIgnoreCase("SUPER_ADMIN");

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User caller = (User) auth.getPrincipal();
        boolean callerIsSuperAdmin = caller.getRole() != null
                && caller.getRole().getRoleName().equalsIgnoreCase("SUPER_ADMIN");

        if (targetIsSuperAdmin && !callerIsSuperAdmin) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Admins cannot disable a SUPER_ADMIN account"));
        }

        if (targetIsSuperAdmin) {
            long enabledSuperAdmins = userRepository
                    .countByRole_RoleNameIgnoreCaseAndEnabledTrue("SUPER_ADMIN");
            if (enabledSuperAdmins <= 1) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "Cannot disable the only remaining SUPER_ADMIN account"));
            }
        }

        user.setEnabled(false);
        user.setDeletedAt(java.time.Instant.now());
        userRepository.save(user);
        refreshRegistrationOf(user);

        userEventPublisher.notifyUsersChanged();

        return ResponseEntity.ok(Map.of("message", "User disabled"));
    }

    @Override
    public ResponseEntity<?> enableUser(Long userId) {
        // Caller must be ADMIN or SUPER_ADMIN -- enforced at the controller
        // via @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')").
        // No special guard needed here -- re-enabling is never the action that
        // can leave the system without a SUPER_ADMIN.

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "User does not exist"));
        }

        user.setEnabled(true);
        user.setDeletedAt(null);
        userRepository.save(user);
        refreshRegistrationOf(user);

        userEventPublisher.notifyUsersChanged();

        return ResponseEntity.ok(Map.of("message", "User re-enabled"));
    }

    private void unlinkFirebasePhoneIfPresent(User user) throws FirebaseAuthException {
        UserRecord firebaseUser = FirebaseAuth.getInstance().getUser(user.getFirebaseUid());

        String existing = firebaseUser.getPhoneNumber();
        if (existing == null || existing.isBlank()) {
            return;
        }

        // Safety net: never strip the only sign-in method.
        boolean hasOtherProvider = java.util.Arrays.stream(firebaseUser.getProviderData())
                .anyMatch(p -> !"phone".equals(p.getProviderId()));
        if (!hasOtherProvider) {
            throw new IllegalStateException("Phone is this account's only sign-in method and can't be unlinked");
        }

        FirebaseAuth.getInstance().updateUser(
                new UserRecord.UpdateRequest(user.getFirebaseUid()).setPhoneNumber(null));
    }

    private void writeAuditLog(Long targetUserId, String previousPhone, String newPhone) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User actor = (User) auth.getPrincipal();

        AuditLog log = new AuditLog();
        log.setActorUserId(actor.getId());
        log.setAction("ADMIN_OVERRIDE_PHONE");
        log.setTargetUserId(targetUserId);
        log.setDetails("Phone changed from '" + previousPhone + "' to '" + newPhone
                + "' by SUPER_ADMIN override (no OTP re-verification)");

        auditLogRepository.save(log);
    }
}