package com.najda.backend.user.service;

import com.najda.backend.user.model.User;
import com.najda.backend.user.model.Role;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.user.repository.RoleRepository;
import com.najda.backend.user.dto.RoleDTO;

import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class RoleServiceImpl implements RoleService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FirebaseClaimsService firebaseClaimsService;

    @Value("${SUPER_ADMIN_EMAIL}")
    private String protectedAdminEmail;

    public RoleServiceImpl(UserRepository userRepository, RoleRepository roleRepository, FirebaseClaimsService firebaseClaimsService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.firebaseClaimsService = firebaseClaimsService;
    }

    @Override
    public ResponseEntity<?> getUserRole(Long userId) {

        if (userId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "User ID is missing"));
        }

        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "No user found for this ID"));
        }

        String roleName = user.getRole() != null
                ? user.getRole().getRoleName()
                : null;

        return ResponseEntity.ok(Map.of("role", roleName));
    }

    @Override
    public ResponseEntity<?> addRole(String roleName) {

        if (roleName == null || roleName.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Role name cannot be empty"));
        }

        if (roleRepository.findByRoleNameIgnoreCase(roleName.trim()).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("error", "Role already exists"));
        }

        Role role = new Role();
        role.setRoleName(roleName.trim().toUpperCase());
        roleRepository.save(role);

        return ResponseEntity.ok(Map.of("message", "Role added successfully"));
    }

    @Override
    public ResponseEntity<?> updateUserRole(Long userId, String roleName) {
        // Caller must be ADMIN or SUPER_ADMIN at minimum -- enforced at the
        // controller via @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')").

        if (userId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "User ID is required"));
        }

        if (roleName == null || roleName.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Role name cannot be empty"));
        }

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "User does not exist"));
        }

        roleName = roleName.replace("\"", "").trim();

        Role newRole = roleRepository.findByRoleNameIgnoreCase(roleName)
                .orElse(null);
                
        if (newRole == null) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Specified role does not exist"));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = (User) auth.getPrincipal();

        boolean callerIsSuperAdmin = hasRole(currentUser, "SUPER_ADMIN");
        boolean isSelf = currentUser.getId().equals(targetUser.getId());
        boolean targetIsSuperAdmin = hasRole(targetUser, "SUPER_ADMIN");
        boolean newRoleIsSuperAdmin = newRole.getRoleName().equalsIgnoreCase("SUPER_ADMIN");

        // Rule: SUPER_ADMIN cannot remove their own SUPER_ADMIN role
        // (prevents accidentally locking everyone out of the highest privilege
        // level -- there'd be no one left who could re-grant it).
        if (callerIsSuperAdmin && isSelf && !newRoleIsSuperAdmin) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "You cannot remove your own SUPER_ADMIN role"));
        }

        // Everything below only applies to a plain ADMIN caller.
        // A SUPER_ADMIN caller is permitted to do anything else.
        if (!callerIsSuperAdmin) {

            // Rule: ADMIN cannot modify any SUPER_ADMIN account at all,
            // even to leave the role effectively unchanged.
            if (targetIsSuperAdmin) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "Admins cannot modify a SUPER_ADMIN account"));
            }

            // Rule: ADMIN cannot assign the SUPER_ADMIN role to anyone.
            if (newRoleIsSuperAdmin) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "Only a SUPER_ADMIN can grant the SUPER_ADMIN role"));
            }
        }

        targetUser.setRole(newRole);
        userRepository.save(targetUser);
        firebaseClaimsService.syncRoleClaim(targetUser.getFirebaseUid(), newRole.getRoleName());

        return ResponseEntity.ok(Map.of("message", "User role updated"));
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRole() != null
                && user.getRole().getRoleName().equalsIgnoreCase(roleName);
    }

    @Override
    public ResponseEntity<?> getAllRoles() {

        List<RoleDTO> roles = roleRepository.findAll().stream()
                .map(role -> new RoleDTO(role.getRoleId(), role.getRoleName()))
                .toList();

        return ResponseEntity.ok(roles);
    }

    @Override
    public ResponseEntity<?> getRoleById(Integer roleId) {

        if (roleId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Role ID is required"));
        }

        Role role = roleRepository.findById(roleId).orElse(null);

        if (role == null) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Role not found"));
        }

        return ResponseEntity.ok(new RoleDTO(role.getRoleId(), role.getRoleName()));
    }
}