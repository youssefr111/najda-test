package com.najda.backend.notification.repository;

import com.najda.backend.notification.model.NotificationType;
import com.najda.backend.notification.model.UserNotification;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

    List<UserNotification> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    List<UserNotification> findByUserIdAndIdLessThanOrderByIdDesc(Long userId, Long before, Pageable pageable);

    long countByUserIdAndReadAtIsNull(Long userId);

    /** Used to collapse a burst of chat messages into one unread notification. */
    boolean existsByUserIdAndTypeAndIncidentIdAndReadAtIsNullAndCreatedAtAfter(
            Long userId, NotificationType type, Long incidentId, Instant after);

    @Transactional
    @Modifying
    @Query("update UserNotification n set n.readAt = :now where n.id = :id and n.userId = :userId and n.readAt is null")
    int markRead(@Param("id") Long id, @Param("userId") Long userId, @Param("now") Instant now);

    @Transactional
    @Modifying
    @Query("update UserNotification n set n.readAt = :now where n.userId = :userId and n.readAt is null")
    int markAllRead(@Param("userId") Long userId, @Param("now") Instant now);

    @Transactional
    @Modifying
    @Query("delete from UserNotification n where n.createdAt < :before")
    int deleteOlderThan(@Param("before") Instant before);
}
