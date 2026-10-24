package com.najda.backend.legal.web;

import com.najda.backend.legal.service.LegalConsentService;
import com.najda.backend.user.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/** Enforces {@link RequiresLegalConsent} before the controller method runs. */
@Component
public class LegalConsentInterceptor implements HandlerInterceptor {

    private final LegalConsentService consentService;

    public LegalConsentInterceptor(LegalConsentService consentService) {
        this.consentService = consentService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (handler instanceof HandlerMethod method && method.hasMethodAnnotation(RequiresLegalConsent.class)) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof User user) {
                consentService.requireCurrentConsent(user.getId());
            }
        }
        return true;
    }
}
