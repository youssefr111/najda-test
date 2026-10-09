package com.najda.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@ConfigurationPropertiesScan
@RestController
public class NajdaApplication {
    public static void main(String[] args) {
        SpringApplication.run(NajdaApplication.class, args);
    }
}