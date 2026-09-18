# ---------- Build stage ----------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy only the POM first so Docker can cache the dependency-download layer
# separately from source changes -- re-running `docker build` after editing
# a .java file won't re-download every dependency, only recompile.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# ---------- Runtime stage ----------
FROM eclipse-temurin:21-jre-jammy

# curl is needed for the HEALTHCHECK below -- not included in the base
# JRE image by default.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as a non-root user rather than the container default root -- standard
# hardening practice, costs nothing to add.
RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring:spring

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
