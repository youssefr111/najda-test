package com.najda.backend.user.service;

import com.google.firebase.auth.FirebaseAuth;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * The single place in the codebase that writes Firebase custom claims.
 *
 * Every code path that creates a User or changes a User's role MUST call
 * syncRoleClaim() right after the Postgres write succeeds. Centralizing
 * this here means "did we remember to sync the claim" only needs to be
 * verified in the four call sites below, not re-derived from scratch
 * anywhere new roles/claims logic gets added later.
 *
 * Postgres remains the authoritative source for authorization -- this
 * claim exists for token-level convenience (Next.js middleware, client
 * UI routing), never as something Spring Boot itself trusts for access
 * control decisions.
 */
@Service
public class FirebaseClaimsService {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseClaimsService.class);

    public void syncRoleClaim(String firebaseUid, String roleName) {
        try {
            FirebaseAuth.getInstance().setCustomUserClaims(
                    firebaseUid, Map.of("role", roleName));
        } catch (Exception e) {
            // Deliberately non-fatal: the Postgres row (source of truth) is
            // already saved by the time this runs. A failed claim sync means
            // the token will be stale until the next successful sync for
            // this UID -- log loudly so it gets noticed and re-run manually
            // if needed, but don't roll back a real authorization change
            // over a token-convenience field failing to update.
            logger.error("Failed to sync Firebase role claim for UID {} (role={}): {}",
                    firebaseUid, roleName, e.getMessage());
        }
    }
}