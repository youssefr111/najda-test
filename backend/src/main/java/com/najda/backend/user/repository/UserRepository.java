package com.najda.backend.user.repository;

import com.najda.backend.user.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByFirebaseUid(String firebaseUid);
    Optional<User> findById(Long id);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.role WHERE u.facility.id = :facilityId AND u.deletedAt IS NULL ORDER BY u.firstName")
    List<User> findManagedStaff(@Param("facilityId") Long facilityId);

    /**
     * Loads the user and locks its row until the surrounding transaction ends, so two concurrent
     * profile edits queue up instead of overwriting each other (a read-modify-save from two
     * requests at once otherwise loses whichever write lands first). Needs an active transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
    long countByRole_RoleNameIgnoreCaseAndEnabledTrue(String roleName);
    boolean existsByPhoneAndPhoneVerifiedTrue(String phone);
    boolean existsByEmailIgnoreCase(String email);

    @EntityGraph(attributePaths = {"role", "facility"})
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