package com.najda.backend.user.service;

import org.springframework.http.ResponseEntity;

public interface RoleService {
    ResponseEntity<?> getAllRoles();
    ResponseEntity<?> getRoleById(Integer roleId);
    ResponseEntity<?> getUserRole(Long userId);
    ResponseEntity<?> updateUserRole(Long userId, String roleName);
    ResponseEntity<?> addRole(String roleName);
}