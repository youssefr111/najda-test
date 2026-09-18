package com.najda.backend.user.model;

import java.util.HashSet;
import java.util.Set;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Integer roleId;

    @Column(unique = true, nullable = false)
    private String roleName;

    @OneToMany(mappedBy = "role")
    @Builder.Default
    private Set<User> users = new HashSet<>();
}