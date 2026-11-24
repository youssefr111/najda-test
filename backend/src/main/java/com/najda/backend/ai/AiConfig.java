package com.najda.backend.ai;

import java.time.Duration;
import java.util.concurrent.Executor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;

/** HTTP client + thread pool for the AI model service (the Python service in /ai). @EnableAsync lives in NotificationConfig. */
@Configuration
public class AiConfig {

    @Bean("aiRestClient")
    RestClient aiRestClient(@Value("${najda.ai.url}") String url, @Value("${najda.ai.api-key}") String apiKey) {
        var factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(3));   // vitals scoring must be quick; it is advisory only
        return RestClient.builder()
                .baseUrl(url)
                .requestFactory(factory)
                .defaultHeader("X-Api-Key", apiKey)
                .build();
    }

    /** Media model calls run for many seconds; they get their own pool so they never starve priority scoring. */
    @Bean("transcriptionExecutor")
    Executor transcriptionExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("stt-");
        executor.initialize();
        return executor;
    }

    @Bean("aiExecutor")
    Executor aiExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("ai-");
        executor.initialize();
        return executor;
    }
}
