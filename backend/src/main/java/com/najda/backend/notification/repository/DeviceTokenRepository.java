package com.najda.backend.notification.repository;

import com.najda.backend.notification.model.DeviceToken;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findByUserId(Long userId);

    @Transactional
    @Modifying
    @Query("delete from DeviceToken d where d.token = :token and d.userId = :userId")
    int deleteByTokenAndUserId(@Param("token") String token, @Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query("delete from DeviceToken d where d.token in :tokens")
    int deleteByTokenIn(@Param("tokens") Collection<String> tokens);

    @Transactional
    @Modifying
    @Query("delete from DeviceToken d where d.lastSeenAt < :before")
    int deleteStale(@Param("before") Instant before);
}
