package com.najda.backend.mail;

public record EmailMessage(String to, String subject, String text, String html) {
}