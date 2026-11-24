package com.najda.backend.user.mapper;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.GetUsersResult;
import com.google.firebase.auth.UidIdentifier;
import com.google.firebase.auth.UserIdentifier;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.user.dto.UserResponse;
import com.najda.backend.user.model.User;
import com.najda.backend.user.service.AddressSupport;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Entity -> response. {@code emailVerified} lives in Firebase, and asking Firebase is a network round trip to Google.
 * It used to be asked once PER USER, so a page of 20 users meant 20 sequential round trips (and every role or facility
 * edit paid one more): that is why the admin screens were slow. Now a list is resolved with ONE batched call, and
 * answers are remembered for a short while.
 */
@Component
public class UserMapper {

    private static final Logger logger = LoggerFactory.getLogger(UserMapper.class);

    /** Firebase's batch lookup accepts at most 100 identifiers. */
    private static final int FIREBASE_BATCH = 100;

    /** How long a known answer is reused. Short: a verification just completed must show up quickly. */
    private static final long CACHE_TTL_MS = 30_000;

    private record Cached(boolean emailVerified, long at) {}

    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    /** One user (an edit's response, the signed-in profile). */
    public UserResponse toResponse(User user) {
        return toResponse(user, emailVerified(user.getFirebaseUid()));
    }

    /** Many users, one Firebase round trip per 100. */
    public List<UserResponse> toResponses(Collection<User> users) {
        Map<String, Boolean> verified = emailVerifiedByUid(users);
        List<UserResponse> responses = new ArrayList<>(users.size());
        for (User user : users) {
            responses.add(toResponse(user, verified.getOrDefault(user.getFirebaseUid(), false)));
        }
        return responses;
    }

    public Map<String, Boolean> emailVerifiedByUid(Collection<User> users) {
        long now = System.currentTimeMillis();
        Map<String, Boolean> result = new HashMap<>();
        List<UserIdentifier> missing = new ArrayList<>();

        for (User user : users) {
            String uid = user.getFirebaseUid();
            Cached cached = cache.get(uid);
            if (cached != null && now - cached.at() < CACHE_TTL_MS) {
                result.put(uid, cached.emailVerified());
            } else if (!result.containsKey(uid)) {
                missing.add(new UidIdentifier(uid));
            }
        }

        for (int from = 0; from < missing.size(); from += FIREBASE_BATCH) {
            List<UserIdentifier> batch = missing.subList(from, Math.min(from + FIREBASE_BATCH, missing.size()));
            try {
                GetUsersResult found = FirebaseAuth.getInstance().getUsers(batch);
                for (UserRecord record : found.getUsers()) {
                    result.put(record.getUid(), record.isEmailVerified());
                    cache.put(record.getUid(), new Cached(record.isEmailVerified(), now));
                }
            } catch (Exception e) {
                logger.warn("Could not fetch emailVerified for {} users: {}", batch.size(), e.getMessage());
            }
        }
        return result;
    }

    private boolean emailVerified(String firebaseUid) {
        Cached cached = cache.get(firebaseUid);
        if (cached != null && System.currentTimeMillis() - cached.at() < CACHE_TTL_MS) return cached.emailVerified();
        try {
            boolean verified = FirebaseAuth.getInstance().getUser(firebaseUid).isEmailVerified();
            cache.put(firebaseUid, new Cached(verified, System.currentTimeMillis()));
            return verified;
        } catch (Exception e) {
            logger.warn("Could not fetch emailVerified status for UID {}: {}", firebaseUid, e.getMessage());
            return false;
        }
    }

    private UserResponse toResponse(User user, boolean emailVerified) {
        return new UserResponse(
                user.getId(),
                user.getFirebaseUid(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                emailVerified,
                user.getPhone(),
                user.isPhoneVerified(),
                user.getRole() != null ? user.getRole().getRoleName() : null,
                user.getFacility() != null ? user.getFacility().getId() : null,
                user.getFacility() != null ? user.getFacility().getName() : null,
                user.getGender(),
                user.isProfileCompleted(),
                user.isEnabled(),
                user.getCreatedAt(),
                AddressSupport.toResponse(user),
                user.getKycStatus()
        );
    }
}
