import com.android.build.api.dsl.ApplicationExtension
import java.util.Properties

// Release signing. Without android/key.properties the release build type falls
// back to the debug key, so local/qa builds work with no keystore at all.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    keystoreProperties.load(keystorePropertiesFile.inputStream())
}

extensions.configure<ApplicationExtension> {
    flavorDimensions += "env"

    productFlavors {
        // flutter run --flavor local          -> env/.env.local
        create("local") {
            dimension = "env"
            applicationId = "com.najda.mobile.local"
            resValue("string", "app_name", "Najda (Local)")
        }
        // flutter build apk --flavor qa       -> env/.env.test
        // (named "qa": Android Gradle forbids flavor names that start with "test")
        create("qa") {
            dimension = "env"
            applicationId = "com.najda.mobile.test"
            resValue("string", "app_name", "Najda (Test)")
        }
        // The released app                    -> env/.env.production
        create("production") {
            dimension = "env"
            applicationId = "com.najda.mobile"
            resValue("string", "app_name", "Najda")
        }
    }

    if (hasReleaseKeystore) {
        signingConfigs {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName(if (hasReleaseKeystore) "release" else "debug")
        }
    }
}
