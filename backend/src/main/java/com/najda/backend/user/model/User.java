package com.najda.backend.user.model;

import jakarta.persistence.Column;
import org.hibernate.annotations.DynamicUpdate;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Collections;
import java.util.Collection;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.najda.backend.facility.model.Facility;
import com.najda.backend.kyc.model.KycStatus;

/*
 * @DynamicUpdate: write only the columns that actually changed. Without it Hibernate rewrites EVERY column from
 * the values it loaded earlier, so two concurrent requests editing different fields of one row (a profile edit
 * and an admin disabling the account, a GPS update and a unit being assigned...) silently overwrite each other.
 */
@DynamicUpdate
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "firebase_uid", nullable = false, unique = true)
    private String firebaseUid;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "email", unique = true)
    private String email;
    
    @Column(name = "phone")
    private String phone;

    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "address_governorate", length = 30)
    private Governorate addressGovernorate;

    @Column(name = "address_city", length = 100)
    private String addressCity;

    @Column(name = "address_street", length = 200)
    private String addressStreet;

    @Column(name = "address_landmark", length = 200)
    private String addressLandmark;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id")
    private Facility facility;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Gender gender;

    @Column(name = "profile_completed", nullable = false)
    private boolean profileCompleted = false;

    @Column(nullable = false)
    private boolean enabled = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false, length = 20)
    private KycStatus kycStatus = KycStatus.NOT_STARTED;

    @Column(name = "kyc_session_id", length = 64)
    private String kycSessionId;

    @Column(name = "kyc_verified_at")
    private Instant kycVerifiedAt;

    @Column(name = "kyc_updated_at")
    private Instant kycUpdatedAt;

    @Column(name = "kyc_decline_reason", length = 200)
    private String kycDeclineReason;

    // ---------- bookkeeping timestamps ----------
    // Tracked here rather than read from Firebase: Firebase only exposes an
    // account-creation timestamp (as epoch millis, not a Instant) and
    // a last-sign-in timestamp -- it has no concept of "profile last
    // updated," and its creation time can lag slightly behind when this
    // Postgres row is actually inserted.

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Set when `enabled` is flipped to false; cleared on reactivation. */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    // ---------- UserDetails contract ----------
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (role == null) {
            return Collections.emptyList();
        }

        return List.of(
            new SimpleGrantedAuthority("ROLE_" + role.getRoleName())
        );
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return firebaseUid;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        // Backs FR-11 (Administrator can suspend a user) -- suspending an
        // account is just flipping this flag, which then blocks
        // authentication on their very next request.
        return enabled;
    }
}