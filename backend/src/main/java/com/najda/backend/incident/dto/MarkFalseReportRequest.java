package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.FalseReportType;

public record MarkFalseReportRequest(FalseReportType type) {}