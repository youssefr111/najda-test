# Keep rules for release builds (R8). Flutter's own rules are added by the Gradle plugin.
-keep class io.flutter.plugins.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.google.android.play.core.**
