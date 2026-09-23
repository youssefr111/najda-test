package com.najda.backend.security.filter;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Verifies the Firebase ID token on every request using the Firebase Admin
 * SDK. Always exposes the verified UID/email/phone as request attributes
 * ("firebaseUid", "firebaseEmail", "firebasePhone") when the token is valid
 * -- this is what lets a brand-new citizen's registration call prove they
 * hold a valid Firebase identity, even before any User row exists for them.
 *
 * Separately, if a matching (and enabled) User row IS found, the full
 * Spring Security Authentication is populated so @PreAuthorize/@AuthenticationPrincipal
 * work normally for every already-registered caller.
 */
@Component
public class FirebaseTokenAuthFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    public FirebaseTokenAuthFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String idToken = authHeader.substring(7);

            try {
                FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(idToken);
                String uid = decoded.getUid();

                // Always exposed once the token itself is proven valid --
                // regardless of whether a User row exists yet.
                request.setAttribute("firebaseUid", uid);
                request.setAttribute("firebaseEmail", decoded.getEmail());
                request.setAttribute("firebasePhone", decoded.getClaims().get("phone_number"));

                Optional<User> maybeUser = userRepository.findByFirebaseUidWithAssociations(uid);
                if (maybeUser.isPresent() && maybeUser.get().isEnabled()) {
                    User user = maybeUser.get();
                    var authentication = new UsernamePasswordAuthenticationToken(
                            user, null, user.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
                // Valid token but no matching (or disabled) User: no
                // Authentication set. That's expected and correct for a
                // first-time registration call.

            } catch (FirebaseAuthException e) {
                logger.error("Firebase verification failed", e);

                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write(
                    "{\"error\":\"Firebase token verification failed\"}"
                );
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}