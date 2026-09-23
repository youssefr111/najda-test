package com.najda.backend.security.configuration;

import java.util.List;
import com.najda.backend.security.filter.FirebaseTokenAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final FirebaseTokenAuthFilter firebaseTokenAuthFilter;

    public SecurityConfig(FirebaseTokenAuthFilter firebaseTokenAuthFilter) {
        this.firebaseTokenAuthFilter = firebaseTokenAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/api/auth/register/citizen").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/email-exists").permitAll()
                // STOMP handshake carries no Bearer token the way a normal
                // REST call does -- FirebaseTokenAuthFilter simply finds
                // nothing to authenticate and passes through harmlessly,
                // but authorizeHttpRequests was rejecting the handshake
                // before it ever got that far. Per-user auth for messages
                // sent over the socket, if ever needed, is a separate
                // concern from the transport-level handshake itself.
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/api/devices/sensor-report").permitAll() // device-key auth, not Firebase -- see below
                .anyRequest().authenticated())
            .addFilterBefore(firebaseTokenAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:8081", "https://najda-web.vercel.app", "https://najda-test.vercel.app"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}