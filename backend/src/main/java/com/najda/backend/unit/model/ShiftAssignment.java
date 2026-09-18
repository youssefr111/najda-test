package com.najda.backend.unit.model;

import com.najda.backend.user.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Links a User to a ResponseUnit for the duration of a shift. A unit
 * cannot receive a mission unless it has an active (endTime == null)
 * ShiftAssignment with a LEAD -- see Section 4.4 of the book:
 * the same relationship as a ride-hailing driver to their car, not the
 * car itself.
 */
@Entity
@Table(name = "shift_assignments")
@Getter
@Setter
@NoArgsConstructor
public class ShiftAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private ResponseUnit unit;

    /** Determines who a mission notification actually goes to for a
        multi-person crew. */
    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_shift", nullable = false)
    private RoleInShift roleInShift;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    /** Null while the shift is active. */
    @Column(name = "end_time")
    private LocalDateTime endTime;
}