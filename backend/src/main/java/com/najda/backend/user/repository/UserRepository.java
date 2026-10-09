package com.najda.backend.user.repository;

import com.najda.backend.user.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByFirebaseUid(String firebaseUid);
    Optional<User> findById(Long id);
    long countByRole_RoleNameIgnoreCaseAndEnabledTrue(String roleName);
    boolean existsByPhoneAndPhoneVerifiedTrue(String phone);
    boolean existsByEmailIgnoreCase(String email);

    @Query("""
    SELECT u FROM User u
    WHERE (:roleName IS NULL OR u.role.roleName = :roleName)
    AND (:enabled IS NULL OR u.enabled = :enabled)
    AND (:search IS NULL
        OR LOWER(u.firstName) LIKE CONCAT('%', CAST(:search AS string), '%')
        OR LOWER(u.lastName) LIKE CONCAT('%', CAST(:search AS string), '%')
        OR LOWER(u.email) LIKE CONCAT('%', CAST(:search AS string), '%'))
    """)
    Page<User> search(
            @Param("roleName") String roleName,
            @Param("enabled") Boolean enabled,
            @Param("search") String search,
            Pageable pageable);
    

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.role LEFT JOIN FETCH u.facility WHERE u.firebaseUid = :firebaseUid")
    Optional<User> findByFirebaseUidWithAssociations(@Param("firebaseUid") String firebaseUid);
}