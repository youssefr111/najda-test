package com.najda.backend.exceptions;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ApiError {
    private int status;
    private Instant timestamp;
    private String message;
    private List<String> errors;
}