package com.najda.backend.kyc.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.audit.model.AuditLog;
import com.najda.backend.audit.repository.AuditLogRepository;
import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.KycProviderException;
import com.najda.backend.exceptions.KycRequiredException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.exceptions.TooManyRequestsException;
import com.najda.backend.exceptions.PhoneVerificationRequiredException;
import com.najda.backend.exceptions.EmailVerificationRequiredException;
import com.najda.backend.user.mapper.UserMapper;
import java.util.List;
import com.najda.backend.kyc.config.KycProperties;
import com.najda.backend.kyc.dto.KycStatusResponse;
import com.najda.backend.kyc.model.KycStatus;
import com.najda.backend.kyc.model.KycWebhookEvent;
import com.najda.backend.kyc.repository.KycWebhookEventRepository;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.user.service.UserEventPublisher;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Identity verification (Didit).
 *
 * <ul>
 *   <li>The BACKEND decides who is verified. A client cannot say "I am verified": the only things that change the status
 *       are Didit's signed webhooks, and an admin's explicit override (audited).</li>
 *   <li>An approval is never taken from the webhook alone: it is confirmed with Didit's decision API first.</li>
 *   <li>Only the outcome is stored (status, provider session id, a short generic reason), never documents or photos.</li>
 * </ul>
 */
@Service
public class KycService {

    public enum WebhookResult { PROCESSED, IGNORED, BAD_SIGNATURE }
    /** What starting verification gives back: a page to open, or (if they are already approved) nothing to open. */
    public record StartResult(String url, KycStatus status) {}

    private static final Logger log = LoggerFactory.getLogger(KycService.class);

    private final KycProperties properties;
    private final DiditClient didit;
    private final UserRepository userRepository;
    private final KycWebhookEventRepository eventRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper mapper;
    private final TransactionTemplate tx;
    private final UserMapper userMapper;
    private final UserEventPublisher userEventPublisher;
    /** When we last asked Didit about each person's open session, so a polling client cannot hammer Didit. */
    private final Map<Long, Instant> lastReconcile = new ConcurrentHashMap<>();
    private final Map<Long, Instant> lastRecovery = new ConcurrentHashMap<>();

    public KycService(
            KycProperties properties,
            DiditClient didit,
            UserRepository userRepository,
            KycWebhookEventRepository eventRepository,
            AuditLogRepository auditLogRepository,
            ObjectMapper mapper,
            PlatformTransactionManager transactionManager,
            UserEventPublisher userEventPublisher,
            UserMapper userMapper) {
        this.properties = properties;
        this.didit = didit;
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.auditLogRepository = auditLogRepository;
        this.mapper = mapper;
        this.tx = new TransactionTemplate(transactionManager);
        this.userMapper = userMapper;
        this.userEventPublisher = userEventPublisher;
    }

    // ------------------------------------------------------------------ reading ---

    private static String roleName(User user) {
        return user.getRole() != null ? user.getRole().getRoleName() : null;
    }

    public KycStatusResponse status(User user) {
        KycStatus status = user.getKycStatus();
        return new KycStatusResponse(
                status,
                KycPolicy.gateApplies(properties, roleName(user), user.getCreatedAt()),
                status == KycStatus.VERIFIED,
                user.getKycVerifiedAt(),
                user.getKycDeclineReason(),
                didit.configured());
    }

    /**
     * The status for the status endpoint. While a verification is open (in progress or in review) it first asks Didit
     * for the session's authoritative result and applies it, exactly as a webhook would. This makes the result show up
     * even when the webhook is late, lost, or cannot reach this server (local development without a tunnel).
     */
    public KycStatusResponse statusRefreshed(User user) {
        reconcile(user, false);
        return status(userRepository.findById(user.getId()).orElse(user));
    }

    /**
     * Brings an OPEN verification (in progress / in review) up to date with Didit, so nobody stays stuck when a webhook
     * is late or lost, or when the session id we stored is not the one that got approved. {@code force} skips the
     * rate limits (used right before starting a new session).
     */
    private void reconcile(User user, boolean force) {
        KycStatus current = user.getKycStatus();
        String sessionId = user.getKycSessionId();
        if (current != KycStatus.IN_PROGRESS && current != KycStatus.IN_REVIEW) return;
        if (!didit.configured()) {
            log.warn("KYC refresh skipped for user {}: Didit is not fully configured (needs DIDIT_API_KEY, DIDIT_WORKFLOW_ID and DIDIT_WEBHOOK_SECRET)", user.getId());
            return;
        }

        Instant now = Instant.now();
        Instant last = lastReconcile.get(user.getId());
        if (!force && last != null && last.isAfter(now.minusSeconds(3))) return;
        lastReconcile.put(user.getId(), now);

        boolean changed = false;
        if (sessionId == null || sessionId.isBlank()) {
            log.warn("KYC refresh user {}: status is {} but no Didit session id is stored", user.getId(), current);
        } else {
            changed = refreshFromStoredSession(user, current, sessionId);
        }
        // The session we have is still open (or unknown to Didit): maybe the person finished a DIFFERENT one.
        if (!changed && current == KycStatus.IN_PROGRESS) recoverApprovedSession(user, force, now);
    }

    /** Asks Didit about the session we have stored. Returns true if the person's status changed. */
    private boolean refreshFromStoredSession(User user, KycStatus current, String sessionId) {
        try {
            DiditClient.Decision decision = didit.fetchDecision(sessionId);
            String expected = properties.didit().vendorData(user.getId());
            log.debug("KYC refresh user {}: Didit session {} is '{}' (vendor_data '{}')", user.getId(), sessionId, decision.status(), decision.vendorData());
            if (!expected.equals(decision.vendorData())) {
                log.warn("KYC refresh user {}: ignoring the result because vendor_data is '{}' but this server expects '{}'. "
                        + "Check DIDIT_VENDOR_PREFIX (it must be the value that was set when the session was created).",
                        user.getId(), decision.vendorData(), expected);
                return false;
            }
            Optional<KycStatus> mapped = KycStatus.fromDidit(decision.status());
            if (mapped.isEmpty()) {
                log.debug("KYC refresh user {}: Didit status '{}' is not one we act on", user.getId(), decision.status());
                return false;
            }
            if (mapped.get() == current) return false;
            KycStatus next = mapped.get();
            String reason = next == KycStatus.DECLINED ? decision.firstWarning() : null;
            Boolean applied = tx.execute(s -> {
                User locked = userRepository.findByIdForUpdate(user.getId()).orElse(null);
                return locked != null && applyTransition(locked, sessionId, next, reason);
            });
            log.info("KYC refresh user {}: {} -> {} {}", user.getId(), current, next, Boolean.TRUE.equals(applied) ? "applied" : "NOT applied (session changed or already settled)");
            return Boolean.TRUE.equals(applied);
        } catch (KycProviderException e) {
            log.warn("Could not refresh the verification of user {} from Didit: {}", user.getId(), e.getMessage());
            return false;
        }
    }

    /**
     * Safety net: looks for an APPROVED session of this person in Didit (matched by vendor_data, which carries this
     * deployment's prefix) even if it is not the one we have stored. If there is one, Didit confirms it and the person
     * becomes verified with that session. Listing is not meant to be polled, so outside {@code force} it runs at most
     * once a minute per person.
     */
    private void recoverApprovedSession(User user, boolean force, Instant now) {
        Instant lastLookup = lastRecovery.get(user.getId());
        if (!force && lastLookup != null && lastLookup.isAfter(now.minusSeconds(60))) return;
        lastRecovery.put(user.getId(), now);
        try {
            String vendor = properties.didit().vendorData(user.getId());
            Optional<String> found = didit.findApprovedSessionId(vendor);
            if (found.isEmpty()) return;
            String foundId = found.get();
            DiditClient.Decision decision = didit.fetchDecision(foundId);
            if (!"Approved".equals(decision.status()) || !vendor.equals(decision.vendorData())) return;

            Boolean applied = tx.execute(s -> {
                User locked = userRepository.findByIdForUpdate(user.getId()).orElse(null);
                if (locked == null || !mayAdoptApprovedSession(locked.getKycStatus())) return false;
                locked.setKycSessionId(foundId); // adopt the session that was really approved
                return applyTransition(locked, foundId, KycStatus.VERIFIED, null);
            });
            log.info("KYC recovery user {}: found approved Didit session {}, {}", user.getId(), foundId, Boolean.TRUE.equals(applied) ? "verified" : "not applied");
        } catch (KycProviderException e) {
            log.warn("KYC recovery for user {} failed: {}", user.getId(), e.getMessage());
        }
    }

    /**
     * Statuses from which an approved session found in Didit may verify the person. DECLINED is left out on purpose:
     * an admin can decline someone by hand, and an old approved session must not undo that.
     */
    private static boolean mayAdoptApprovedSession(KycStatus status) {
        return status == KycStatus.IN_PROGRESS || status == KycStatus.NOT_STARTED
                || status == KycStatus.ABANDONED || status == KycStatus.EXPIRED;
    }

    /** Right before opening a new Didit session: has this person already been approved? */
    private void settleBeforeStart(User user) {
        KycStatus current = user.getKycStatus();
        if (current == KycStatus.IN_PROGRESS || current == KycStatus.IN_REVIEW) {
            reconcile(user, true);
        } else if (mayAdoptApprovedSession(current)) {
            recoverApprovedSession(user, true, Instant.now());
        }
    }

    /** The gate in front of "report an emergency": verified email, verified phone, then (when required) verified identity. */
    public void requireMayReport(User user) {
        // Email verification lives in Firebase. If Firebase cannot be reached the answer is simply missing, and an
        // emergency report is never blocked over that: only a definite "not verified" blocks.
        String uid = user.getFirebaseUid();
        Boolean emailVerified = uid == null ? null : userMapper.emailVerifiedByUid(List.of(user)).get(uid);
        if (Boolean.FALSE.equals(emailVerified)) {
            throw new EmailVerificationRequiredException(
                    "A verified email address is required before you can report an emergency. "
                            + "If this is an emergency right now, call 122 (police), 123 (ambulance) or 180 (fire).");
        }
        if (!user.isPhoneVerified()) {
            throw new PhoneVerificationRequiredException(
                    "A verified phone number is required before you can report an emergency. "
                            + "If this is an emergency right now, call 122 (police), 123 (ambulance) or 180 (fire).");
        }
        if (!KycPolicy.mayReport(properties, roleName(user), user.getCreatedAt(), user.getKycStatus())) {
            // About to block: if their verification is still open, ask Didit first. They may already be approved.
            reconcile(user, false);
            User fresh = userRepository.findById(user.getId()).orElse(user);
            if (!KycPolicy.mayReport(properties, roleName(fresh), fresh.getCreatedAt(), fresh.getKycStatus())) {
                throw new KycRequiredException(
                        "Identity verification is required before you can report an emergency. "
                                + "If this is an emergency right now, call 122 (police), 123 (ambulance) or 180 (fire).");
            }
        }
    }
    
    // ----------------------------------------------------------------- starting ---

    /** Creates a Didit session for this person and returns the hosted page they should open. */
    public StartResult start(Long userId) {
        if (!didit.configured()) {
            throw new com.najda.backend.exceptions.KycProviderException("Identity verification is not configured on this server");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Never open a second session on top of one that is still open: first find out how the one we have ended. If
        // Didit already approved it (and we just did not hear about it), the person is verified and must not start over.
        // If it is still genuinely open, Didit hands back that same unfinished session below instead of making a new one.
        settleBeforeStart(user);
        user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        KycStatus current = user.getKycStatus();
        if (current == KycStatus.VERIFIED) return new StartResult(null, KycStatus.VERIFIED); // already approved: nothing to open
        if (current == KycStatus.IN_REVIEW) {
            throw new ConflictException("Your verification is being reviewed. We will tell you the result.");
        }
        Instant updated = user.getKycUpdatedAt();
        if (current == KycStatus.IN_PROGRESS && updated != null && updated.isAfter(Instant.now().minusSeconds(10))) {
            throw new TooManyRequestsException("Please wait a moment before starting again.", Duration.ofSeconds(10));
        }

        // The external call is made OUTSIDE any database transaction.
        DiditClient.Session session = didit.createSession(properties.didit().vendorData(userId), properties.didit().returnUrl());

        tx.executeWithoutResult(status -> {
            User locked = userRepository.findByIdForUpdate(userId).orElseThrow();
            // A new session replaces the old one: webhooks for the old session are ignored from now on.
            locked.setKycSessionId(session.sessionId());
            locked.setKycStatus(KycStatus.IN_PROGRESS);
            locked.setKycUpdatedAt(Instant.now());
            locked.setKycDeclineReason(null);
            userRepository.save(locked);
        });
        return new StartResult(session.url(), KycStatus.IN_PROGRESS);
    }

    // ----------------------------------------------------------------- webhook ---

    public WebhookResult handleWebhook(byte[] rawBody, String signature, String timestamp) {
        if (!DiditWebhookVerifier.verify(
                rawBody, signature, timestamp, properties.didit().webhookSecret(), Instant.now().getEpochSecond())) {
            return WebhookResult.BAD_SIGNATURE;
        }

        JsonNode event;
        try {
            event = mapper.readTree(rawBody);
        } catch (Exception e) {
            return WebhookResult.IGNORED;
        }
        if (!"status.updated".equals(event.path("webhook_type").asText())) return WebhookResult.IGNORED;

        // A sandbox session must never verify a real account (or the other way round).
        String environment = event.path("environment").asText("");
        if (!environment.isBlank() && !environment.equalsIgnoreCase(properties.didit().environment())) {
            log.warn("Ignoring a Didit webhook from the '{}' environment (this server is '{}')", environment, properties.didit().environment());
            return WebhookResult.IGNORED;
        }

        String eventId = event.path("event_id").asText("");
        String sessionId = event.path("session_id").asText("");
        Optional<KycStatus> mapped = KycStatus.fromDidit(event.path("status").asText(""));
        Long userId = properties.didit().userIdFrom(event.path("vendor_data").asText(""));
        if (eventId.isBlank() || sessionId.isBlank() || mapped.isEmpty() || userId == null) return WebhookResult.IGNORED;
        if (eventRepository.existsById(eventId)) return WebhookResult.IGNORED; // a retry we already handled

        KycStatus next = mapped.get();
        String reason = null;

        if (next == KycStatus.VERIFIED) {
            // Do not grant verification on the strength of a message alone: ask Didit. (If this call fails the
            // exception makes us answer 5xx, and Didit retries the delivery.)
            DiditClient.Decision decision = didit.fetchDecision(sessionId);
            boolean confirmed = "Approved".equals(decision.status()) && properties.didit().vendorData(userId).equals(decision.vendorData());
            if (!confirmed) {
                log.warn("Didit webhook said Approved for session {} but the decision API disagrees: ignoring", sessionId);
                return WebhookResult.IGNORED;
            }
        } else if (next == KycStatus.DECLINED) {
            reason = DiditClient.firstWarning(event.path("decision"));
        }

        final KycStatus finalNext = next;
        final String finalReason = reason;
        Boolean applied = tx.execute(status -> {
            eventRepository.save(new KycWebhookEvent(eventId));
            userEventPublisher.notifyUsersChanged();
            User user = userRepository.findByIdForUpdate(userId).orElse(null);
            if (user == null) return false;
            return applyTransition(user, sessionId, finalNext, finalReason);
        });
        return Boolean.TRUE.equals(applied) ? WebhookResult.PROCESSED : WebhookResult.IGNORED;
    }

    /** Applies Didit's result to a (locked) user. Shared by the webhook and by the status refresh. Call inside a transaction. */
    private boolean applyTransition(User user, String sessionId, KycStatus next, String reason) {
        // Only the person's CURRENT session counts; an older one (they started again) is ignored.
        if (!sessionId.equals(user.getKycSessionId())) return false;

        // A late or retried "in progress" must not undo a finished result; a final verdict (approved or declined,
        // including a reviewer changing their mind) always applies.
        boolean allowed = next == KycStatus.VERIFIED || next == KycStatus.DECLINED || !user.getKycStatus().isSettled();
        if (!allowed) return false;

        user.setKycStatus(next);
        user.setKycUpdatedAt(Instant.now());
        user.setKycVerifiedAt(next == KycStatus.VERIFIED ? Instant.now() : user.getKycVerifiedAt());
        user.setKycDeclineReason(next == KycStatus.DECLINED ? truncate(reason) : null);
        userRepository.save(user);

        audit(user.getId(), "KYC_" + next.name(), user.getId(), "Didit session " + sessionId);
        return true;
    }

    // -------------------------------------------------------------------- admin ---

    /**
     * Sets a user's status by hand: for testing, and as the fallback when the provider cannot read someone's ID
     * (a person must never be locked out of reporting for good because of a document the scanner cannot handle).
     * Audited. In-flight states belong to the provider and cannot be set by hand.
     */
    @SuppressWarnings("null")
    public KycStatusResponse adminSetStatus(User actor, Long targetUserId, KycStatus status, String note) {
        if (status == KycStatus.IN_PROGRESS || status == KycStatus.IN_REVIEW) {
            throw new IllegalArgumentException("IN_PROGRESS and IN_REVIEW are set by the verification provider");
        }
        // A reset also deletes the person's session (documents, selfie, face data) from Didit, so they can verify again
        // without being flagged as a duplicate of themselves. Done BEFORE we change anything, and outside the database
        // transaction: if Didit fails, the admin sees the error and nothing was reset.
        boolean erased = false;
        if (status == KycStatus.NOT_STARTED && didit.configured()) {
            String sessionId = userRepository.findById(targetUserId).map(User::getKycSessionId).orElse(null);
            if (sessionId != null && !sessionId.isBlank()) {
                didit.deleteSession(sessionId);
                erased = true;
            }
            // Every other session Didit holds for this person goes too (older or orphaned ones). Otherwise the recovery
            // above would find an old approved session and verify them again straight after the reset.
            if (didit.deleteAllSessions(properties.didit().vendorData(targetUserId)) > 0) erased = true;
        }
        final boolean sessionErased = erased;

        return tx.execute(txStatus -> {
            User target = userRepository.findByIdForUpdate(targetUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            if (sessionErased) target.setKycSessionId(null); // also ignores any late webhook for the deleted session
            target.setKycStatus(status);
            target.setKycUpdatedAt(Instant.now());
            target.setKycVerifiedAt(status == KycStatus.VERIFIED ? Instant.now() : null);
            target.setKycDeclineReason(null);
            userRepository.save(target);
            userEventPublisher.notifyUsersChanged();
            audit(actor.getId(), "ADMIN_KYC_OVERRIDE", target.getId(),
                    "Set to " + status + (sessionErased ? " (Didit session deleted)" : "") + (note == null || note.isBlank() ? "" : ": " + note.trim()));
            return status(target);
        });
    }

    // -------------------------------------------------------------- housekeeping ---

    @Scheduled(cron = "0 30 3 * * *")
    public void purgeOldWebhookEvents() {
        tx.executeWithoutResult(s -> eventRepository.deleteOlderThan(Instant.now().minus(Duration.ofDays(7))));
    }

    // ------------------------------------------------------------------ helpers ---

    private void audit(Long actorId, String action, Long targetUserId, String details) {
        AuditLog log = new AuditLog();
        log.setActorUserId(actorId);
        log.setAction(action);
        log.setTargetUserId(targetUserId);
        log.setDetails(details);
        auditLogRepository.save(log);
    }

    private static String truncate(String value) {
        if (value == null || value.isBlank()) return null;
        return value.length() <= 200 ? value : value.substring(0, 200);
    }
}
