package com.najda.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.najda.backend.security.configuration.CorsProperties;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final CorsProperties corsProperties;

    public WebSocketConfig(CorsProperties corsProperties) {
        this.corsProperties = corsProperties;
 
    }
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Heartbeats both ways: without them an idle connection that a proxy drops silently is never
        // noticed, and the screen stops updating until it is refreshed. The client sends/expects the same 10 s.
        registry.enableSimpleBroker("/topic")
                .setHeartbeatValue(new long[] {10_000, 10_000})
                .setTaskScheduler(stompHeartbeatScheduler());
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(corsProperties.allowedOrigins().toArray(String[]::new));
    }

    @Bean
    public ThreadPoolTaskScheduler stompHeartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("stomp-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }
}
