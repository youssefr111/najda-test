package com.najda.backend.user.service;

import com.google.firebase.auth.FirebaseAuth;
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

    public FirebaseSyncServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserMapper userMapper) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userMapper = userMapper;
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
            userRepository.delete(user);
        }
    }

    private String capitalize(String s) {
        if (s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}