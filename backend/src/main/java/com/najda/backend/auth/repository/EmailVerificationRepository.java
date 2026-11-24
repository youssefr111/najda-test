package com.najda.backend.auth.repository;

import com.najda.backend.auth.model.EmailVerification;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findByEmail(String email);

    /** Row-locks the record so parallel guesses can't race past the attempt limit. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from EmailVerification v where v.email = :email")
    Optional<EmailVerification> findByEmailForUpdate(@Param("email") String email);

    @Modifying
    @Query("delete from EmailVerification v where v.email = :email")
    void deleteByEmail(@Param("email") String email);

    @Modifying
    @Query("""
            delete from EmailVerification v
            where (v.verifiedUntil is null and v.expiresAt < :now)
               or v.verifiedUntil < :now
            """)
    int deleteStale(@Param("now") Instant now);
}