# ---------- Build stage ----------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy only the POM first so Docker can cache the dependency-download layer separately from source changes:
# editing a .java file re-compiles, it does not re-download every dependency.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
# Tests run in CI / locally (`./mvnw test`); the image build only needs the jar. Flyway migrations
# (src/main/resources/db/migration) are inside the jar and run when the app starts.
RUN mvn -B -q clean package -DskipTests

# ---------- Runtime stage ----------
FROM eclipse-temurin:21-jre-jammy

# curl is needed for the HEALTHCHECK below (not in the base JRE image).
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as a non-root user.
RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring:spring

WORKDIR /app
COPY --from=build --chown=spring:spring /app/target/*.jar app.jar

# Override from compose (BACKEND_JAVA_OPTS). 75% of the container's memory suits a dedicated container.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

EXPOSE 8080

# /api/health is the public liveness check and touches no dependency. The start period is generous because the
# first start runs Flyway migrations and initialises the Firebase Admin SDK.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://localhost:8080/api/health || exit 1

# `exec` so the JVM is PID 1 and receives SIGTERM (graceful shutdown on `docker stop`).
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
