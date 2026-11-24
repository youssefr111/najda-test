import com.android.build.api.dsl.ApplicationExtension
import java.util.Properties

plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.najda.najda"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.najda.najda"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        debug {

        }
        
        release {
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }

    buildFeatures {
        resValues = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

// --------------------------------------------------
// Keystore properties
// --------------------------------------------------

/**
 * Loads a signing properties file from the Android root project.
 * Returns null when the file is missing or does not define a `storeFile`,
 * so unrelated files (e.g. a generated local.properties) never trigger signing.
 */
fun loadSigningProperties(fileName: String, required: Boolean = false): Properties? {
    val file = rootProject.file(fileName).takeIf { it.exists() } ?: return null
    val properties = file.inputStream().use { stream -> Properties().apply { load(stream) } }
    if (!properties.containsKey("storeFile")) {
        check(!required) { "$fileName exists but does not define storeFile" }
        return null
    }
    return properties
}

val signingProperties: Map<String, Properties?> = mapOf(
    "localRelease" to loadSigningProperties("local-key.properties"),
    "qaRelease" to loadSigningProperties("qa-key.properties", required = true),
    "productionRelease" to loadSigningProperties("key.properties", required = true),
)

extensions.configure<ApplicationExtension> {
    // --------------------------------------------------
    // Signing configurations
    // --------------------------------------------------
    signingConfigs {
        signingProperties.forEach { (name, properties) ->
            if (properties != null) {
                create(name) {
                    keyAlias = properties.getProperty("keyAlias")
                    keyPassword = properties.getProperty("keyPassword")
                    storeFile = rootProject.file(properties.getProperty("storeFile"))
                    storePassword = properties.getProperty("storePassword")
                }
            }
        }
    }

    // --------------------------------------------------
    // Product flavors
    // --------------------------------------------------
    flavorDimensions += "env"

    productFlavors {
        create("local") {
            dimension = "env"
            applicationId = "com.najda.mobile.local"
            resValue("string", "app_name", "Najda (Local)")
            signingConfigs.findByName("localRelease")?.let { signingConfig = it }
        }

        create("qa") {
            dimension = "env"
            applicationId = "com.najda.mobile.test"
            resValue("string", "app_name", "Najda (Test)")
            signingConfigs.findByName("qaRelease")?.let { signingConfig = it }
        }

        create("production") {
            dimension = "env"
            applicationId = "com.najda.mobile"
            resValue("string", "app_name", "Najda")
            signingConfigs.findByName("productionRelease")?.let { signingConfig = it }
        }
    }
}

// Sign debug builds with the same per-flavor key when one is available.
androidComponents {
    onVariants(selector().withBuildType("debug")) { variant ->
        android.signingConfigs
            .findByName("${variant.flavorName}Release")
            ?.let { variant.signingConfig.setConfig(it) }
    }
}