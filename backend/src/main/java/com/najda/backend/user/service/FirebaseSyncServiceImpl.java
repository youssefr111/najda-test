package com.najda.backend.user.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.AuthErrorCode;
import com.google.firebase.auth.ExportedUserRecord;
import com.google.firebase.auth.ListUsersPage;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.user.dto.FirebaseSyncReportResponse;
import com.najda.backend.user.dto.OrphanedFirebaseUserResponse;
import com.najda.backend.user.dto.OrphanedPostgresUserResponse;
import com.najda.backend.user.dto.UserResponse;
import com.najda.backend.user.mapper.UserMapper;
import com.najda.backend.user.model.Role;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.RoleRepository;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.security.util.TemporaryPasswordGenerator;
import org.springframework.util.StringUtils;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FirebaseSyncServiceImpl implements FirebaseSyncService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final FirebaseClaimsService firebaseClaimsService;
    private final TemporaryPasswordGenerator temporaryPasswordGenerator;

    public FirebaseSyncServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserMapper userMapper,
            FirebaseClaimsService firebaseClaimsService,
            TemporaryPasswordGenerator temporaryPasswordGenerator) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userMapper = userMapper;
        this.firebaseClaimsService = firebaseClaimsService;
        this.temporaryPasswordGenerator = temporaryPasswordGenerator;
    }

    @Override
    public FirebaseSyncReportResponse buildReport() throws Exception {
        Set<String> firebaseUids = new HashSet<>();
        List<OrphanedFirebaseUserResponse> orphanedFirebase = new ArrayList<>();

        ListUsersPage page = FirebaseAuth.getInstance().listUsers(null);
        while (page != null) {
            for (ExportedUserRecord record : page.getValues()) {
                firebaseUids.add(record.getUid());
                if (userRepository.findByFirebaseUid(record.getUid()).isEmpty()) {
                    orphanedFirebase.add(new OrphanedFirebaseUserResponse(record.getUid(), record.getEmail()));
                }
            }
            page = page.getNextPage();
        }

        List<OrphanedPostgresUserResponse> orphanedPostgres = userRepository.findAll().stream()
                .filter(u -> !firebaseUids.contains(u.getFirebaseUid()))
                .map(u -> new OrphanedPostgresUserResponse(u.getId(), u.getEmail(), u.getFirebaseUid()))
                .toList();

        return new FirebaseSyncReportResponse(orphanedFirebase, orphanedPostgres);
    }

    @Override
    @Transactional
    public UserResponse syncFirebaseUser(String uid) throws Exception {
        if (userRepository.findByFirebaseUid(uid).isPresent()) {
            throw new IllegalArgumentException("This Firebase account already has a matching database row.");
        }

        UserRecord firebaseUser = FirebaseAuth.getInstance().getUser(uid);
        String email = firebaseUser.getEmail();
        if (email == null || email.isBlank() || !email.contains("@")) {
            throw new IllegalArgumentException("This Firebase account has no usable email -- can't sync it automatically.");
        }

        // Best-effort name guess from the email's local part (before @),
        // split on common name separators -- e.g. mohamed.ahmed@gmail.com
        // -> "Mohamed" / "Ahmed". No separator found just means first name
        // only. Always left as profileCompleted=false regardless, so the
        // real person (or an admin) corrects this properly on next login
        // rather than this guess ever being treated as final.
        String localPart = email.substring(0, email.indexOf('@'));
        String[] nameParts = localPart.split("[._-]", 2);
        String guessedFirstName = capitalize(nameParts[0]);
        String guessedLastName = nameParts.length > 1 ? capitalize(nameParts[1]) : "";

        Role citizenRole = roleRepository.findByRoleNameIgnoreCase("CITIZEN")
                .orElseThrow(() -> new IllegalStateException("CITIZEN role missing after role seeding"));

        User user = new User();
        user.setFirebaseUid(uid);
        user.setEmail(email);
        user.setFirstName(guessedFirstName);
        user.setLastName(guessedLastName);
        
        String firebasePhone = firebaseUser.getPhoneNumber();
        boolean phoneAlreadyClaimed = firebasePhone != null && userRepository.existsByPhoneAndPhoneVerifiedTrue(firebasePhone);
        user.setPhone(phoneAlreadyClaimed ? null : firebasePhone);
        user.setPhoneVerified(!phoneAlreadyClaimed && firebasePhone != null);

        user.setRole(citizenRole);
        user.setProfileCompleted(false);

        userRepository.save(user);
        return userMapper.toResponse(user);
    }

    @Override
    public void syncPostgresUserToFirebase(Long userId) throws FirebaseAuthException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        try {
            FirebaseAuth.getInstance().createUser(buildFirebaseCreateRequest(user));
        } catch (FirebaseAuthException e) {
            // UID_ALREADY_EXISTS doubles as the safety check: an existing
            // Firebase account is never overwritten, whatever the report said.
            String conflict = describeConflict(e.getAuthErrorCode());
            if (conflict != null) {
                throw new IllegalArgumentException(conflict, e);
            }
            throw e;
        }

        firebaseClaimsService.syncRoleClaim(user.getFirebaseUid(), user.getRole().getRoleName());
    }

    /**
     * Recreates the account under the row's existing UID, so nothing in
     * Postgres has to change. Firebase has no "phone present but unverified"
     * state -- a phone number on the record IS a verified credential -- so
     * the phone is only attached when the row's phone is verified. Email is
     * left unverified: the database doesn't track it, so the user re-verifies.
     */
    private UserRecord.CreateRequest buildFirebaseCreateRequest(User user) {
        boolean hasEmail = StringUtils.hasText(user.getEmail());
        boolean hasVerifiedPhone = user.isPhoneVerified() && StringUtils.hasText(user.getPhone());
        if (!hasEmail && !hasVerifiedPhone) {
            throw new IllegalArgumentException("This user has no email or verified phone number to sign in with.");
        }

        UserRecord.CreateRequest request = new UserRecord.CreateRequest()
                .setUid(user.getFirebaseUid())
                .setDisplayName((user.getFirstName() + " " + user.getLastName()).trim());

        if (hasEmail) {
            // Throwaway password: the user sets their own via "Forgot password".
            request.setEmail(user.getEmail()).setPassword(temporaryPasswordGenerator.generate());
        }
        if (hasVerifiedPhone) {
            request.setPhoneNumber(user.getPhone());
        }
        return request;
    }

    private static String describeConflict(AuthErrorCode code) {
        if (code == null) {
            return null;
        }
        return switch (code) {
            case UID_ALREADY_EXISTS -> "This user already exists in Firebase -- nothing to sync.";
            case EMAIL_ALREADY_EXISTS -> "A different Firebase account already uses this email.";
            case PHONE_NUMBER_ALREADY_EXISTS -> "A different Firebase account already uses this phone number.";
            default -> null;
        };
    }

    @Override
    public void deleteOrphanedFirebaseUser(String uid) throws Exception {
        // Safety check -- never delete a Firebase account that turns out
        // to actually have a Postgres row, regardless of what the report
        // said a moment ago (something could have changed in between).
        if (userRepository.findByFirebaseUid(uid).isPresent()) {
            throw new IllegalArgumentException("This Firebase account has a matching Postgres row -- not orphaned, refusing to delete.");
        }
        FirebaseAuth.getInstance().deleteUser(uid);
    }

    @Override
    public void deleteOrphanedPostgresUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        try {
            FirebaseAuth.getInstance().getUser(user.getFirebaseUid());
            // If this line is reached, Firebase DID find a user -- meaning
            // this row is NOT actually orphaned. Refuse rather than delete
            // a real account's database row.
            throw new IllegalArgumentException("This account's Firebase user still exists -- not orphaned, refusing to delete.");
        } catch (com.google.firebase.auth.FirebaseAuthException e) {
            // Expected outcome for a genuinely orphaned row: Firebase has
            // no user for this UID at all.
            try {
                userRepository.delete(user);
                userRepository.flush();
            } catch (org.springframework.dao.DataIntegrityViolationException ex) {
                // Other tables (incidents, missions, audit actor, ...) still point at this row.
                throw new IllegalArgumentException(
                        "This user is still referenced by other records (e.g. incidents, missions or audit entries they performed) and can't be deleted.", ex);
            }
        }
    }

    private String capitalize(String s) {
        if (s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}