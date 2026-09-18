package com.najda.backend.user.controller;

import com.najda.backend.user.dto.*;
import com.najda.backend.user.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RolesController {

    private final RoleService roleService;

    @GetMapping("/roles")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> getAllRoles() {
        return roleService.getAllRoles();
    }

    @PostMapping("/roles")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> addRole(@RequestBody RoleRequest request) {
        return roleService.addRole(request.getRoleName());
    }

    @GetMapping("/roles/{roleId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> getRoleById(@PathVariable(required = false) Integer roleId) {
        if (roleId == null) {
            return ResponseEntity.badRequest().build();
        }
        return roleService.getRoleById(roleId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN') or #userId == principal.userId")
    @GetMapping("/users/{userId}/role")
    public ResponseEntity<?> getUserRole(@PathVariable Long userId) {
        return roleService.getUserRole(userId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long userId, @RequestBody String roleName) {
        return roleService.updateUserRole(userId, roleName);
    }
}