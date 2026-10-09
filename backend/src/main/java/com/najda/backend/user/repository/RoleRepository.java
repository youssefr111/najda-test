package com.najda.backend.user.repository;

import com.najda.backend.user.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByRoleId(Integer roleId);
    Optional<Role> findByRoleNameIgnoreCase(String roleName);
}
