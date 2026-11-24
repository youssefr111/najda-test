package com.najda.backend.user.model;

import com.najda.backend.incident.model.MessageContentConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A third party's personal data, so name and number are encrypted at rest like other free text. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyContact {

    @Convert(converter = MessageContentConverter.class)
    @Column(name = "name", nullable = false, columnDefinition = "TEXT")
    private String name;

    @Convert(converter = MessageContentConverter.class)
    @Column(name = "phone", nullable = false, columnDefinition = "TEXT")
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship", nullable = false, length = 20)
    private ContactRelationship relationship;
}