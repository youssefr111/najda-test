package com.najda.backend.notification.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.LinkedHashMap;
import java.util.Map;

/** Stores a small string map as JSON text (no database-specific JSON type needed). */
@Converter
public class JsonMapConverter implements AttributeConverter<Map<String, String>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<LinkedHashMap<String, String>> TYPE = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(Map<String, String> attribute) {
        try {
            return MAPPER.writeValueAsString(attribute == null ? Map.of() : attribute);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise notification text", e);
        }
    }

    @Override
    public Map<String, String> convertToEntityAttribute(String dbData) {
        try {
            return dbData == null || dbData.isBlank() ? Map.of() : MAPPER.readValue(dbData, TYPE);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not read notification text", e);
        }
    }
}
