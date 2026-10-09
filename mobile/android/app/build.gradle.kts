import com.android.build.api.dsl.ApplicationExtension
import java.io.File
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
        release {
            // Leave release clean so it respects flavor-specific signing configs below.
            // If you want ProGuard/shrinking, you can enable it here:
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
// Keystore Properties Loading
// --------------------------------------------------

val productionProperties = Properties()
val productionPropertiesFile = rootProject.file("key.properties")
val hasProductionKeystore = productionPropertiesFile.exists()

if (hasProductionKeystore) {
    productionPropertiesFile.inputStream().use { productionProperties.load(it) }
}

val qaProperties = Properties()
val qaPropertiesFile = rootProject.file("qa-key.properties")
val hasQaKeystore = qaPropertiesFile.exists()

if (hasQaKeystore) {
    qaPropertiesFile.inputStream().use { qaProperties.load(it) }
}

extensions.configure<ApplicationExtension> {
    // --------------------------------------------------
    // Separate signing configurations
    // --------------------------------------------------
    signingConfigs {
        if (hasProductionKeystore) {
            create("productionRelease") {
                keyAlias = productionProperties["keyAlias"] as String?
                keyPassword = productionProperties["keyPassword"] as String?
                storeFile = rootProject.file(productionProperties["storeFile"] as String)
                storePassword = productionProperties["storePassword"] as String?
            }
        }

        if (hasQaKeystore) {
            create("qaRelease") {
                keyAlias = qaProperties["keyAlias"] as String?
                keyPassword = qaProperties["keyPassword"] as String?
                storeFile = rootProject.file(qaProperties["storeFile"] as String)
                storePassword = qaProperties["storePassword"] as String?
            }
        }
    }

    // --------------------------------------------------
    // Product flavors & Assigning Keys
    // --------------------------------------------------
    flavorDimensions.add("env")
    
    productFlavors {
        create("local") {
            dimension = "env"
            applicationId = "com.najda.mobile.local"
            resValue("string", "app_name", "Najda (Local)")
        }

        create("qa") {
            dimension = "env"
            applicationId = "com.najda.mobile.test"
            resValue("string", "app_name", "Najda (Test)")
            if (hasQaKeystore) {
                signingConfig = signingConfigs.getByName("qaRelease")
            }
        }

        create("production") {
            dimension = "env"
            applicationId = "com.najda.mobile"
            resValue("string", "app_name", "Najda")
            if (hasProductionKeystore) {
                signingConfig = signingConfigs.getByName("productionRelease")
            }
        }
    }
}