package com.najda.backend.security.configuration;

import com.najda.backend.user.model.Role;
import com.najda.backend.user.model.User;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.user.model.Gender;
import com.najda.backend.user.repository.RoleRepository;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.user.service.FirebaseClaimsService;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(1)
@RequiredArgsConstructor
public class SystemRoleInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(SystemRoleInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final FirebaseClaimsService firebaseClaimsService;

    @Value("${SUPER_ADMIN_FIREBASE_UID}")
    private String bootstrapSuperAdminUid;

    @Value("${SUPER_ADMIN_EMAIL}")
    private String bootstrapSuperAdminEmail;

    @Override
    @Transactional
    public void run(String... args) {
        createRoleIfNotExists("SUPER_ADMIN");
        createRoleIfNotExists("ADMIN");
        createRoleIfNotExists("DISPATCHER");
        createRoleIfNotExists("FIRST_RESPONDER");
        createRoleIfNotExists("CITIZEN");
        createRoleIfNotExists("HOSPITAL_STAFF");
        createRoleIfNotExists("AMBULANCE_CREW");
        createRoleIfNotExists("POLICE");
        createRoleIfNotExists("FIREFIGHTER");

        bootstrapSuperAdminIfConfigured();
    }

    private Role createRoleIfNotExists(String roleName) {
        return roleRepository.findByRoleNameIgnoreCase(roleName)
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setRoleName(roleName);
                    return roleRepository.save(role);
                });
    }

     private void bootstrapSuperAdminIfConfigured() {
        if (bootstrapSuperAdminUid == null || bootstrapSuperAdminUid.isBlank()) {
            logger.warn("SUPER_ADMIN bootstrap skipped -- SUPER_ADMIN_FIREBASE_UID is not set");
            return;
        }

        if (userRepository.findByFirebaseUid(bootstrapSuperAdminUid).isPresent()) {
            firebaseClaimsService.syncRoleClaim(bootstrapSuperAdminUid, "SUPER_ADMIN");
            logger.info("SUPER_ADMIN bootstrap skipped -- a User already exists for UID {}", bootstrapSuperAdminUid);
            return;
        }

        Role superAdminRole = roleRepository.findByRoleNameIgnoreCase("SUPER_ADMIN")
                .orElseThrow(() -> new IllegalStateException("SUPER_ADMIN role missing after seeding"));

        // Pull whatever Firebase already knows about this account -- it was
        // created by hand in the console specifically for this bootstrap
        // step, so its real phone/email (if set) is the actual source of
        // truth, not a guessed placeholder.
        UserRecord firebaseUser = fetchFirebaseUserOrNull(bootstrapSuperAdminUid);

        String phone = (firebaseUser != null) ? firebaseUser.getPhoneNumber() : null;
        String email = (firebaseUser != null && firebaseUser.getEmail() != null)
                ? firebaseUser.getEmail()
                : (bootstrapSuperAdminEmail.isBlank() ? null : bootstrapSuperAdminEmail);

        boolean phoneVerified = (phone != null);

        if (phone == null) {
            logger.warn("SUPER_ADMIN bootstrap: no phone number set on Firebase account {} -- "
                    + "leaving phone blank. Add one in the Firebase console if needed.", bootstrapSuperAdminUid);
        }

        User user = new User();
        user.setFirebaseUid(bootstrapSuperAdminUid);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPhoneVerified(phoneVerified);
        user.setFirstName("Youssef");
        user.setLastName("Ramadan");
        user.setRole(superAdminRole);
        user.setAddress("Egypt");
        user.setProfileCompleted(true);
        user.setFacility(null);
        user.setGender(Gender.MALE);

        userRepository.save(user);
        firebaseClaimsService.syncRoleClaim(bootstrapSuperAdminUid, "SUPER_ADMIN");

        logger.info("Bootstrapped SUPER_ADMIN user and claim for UID {}", bootstrapSuperAdminUid);
    }

    private UserRecord fetchFirebaseUserOrNull(String uid) {
        try {
            return FirebaseAuth.getInstance().getUser(uid);
        } catch (FirebaseAuthException e) {
            logger.error("Could not fetch Firebase user {} during bootstrap: {}", uid, e.getMessage());
            return null;
        }
    }
}