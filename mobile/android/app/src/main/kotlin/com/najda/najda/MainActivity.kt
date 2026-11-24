package com.najda.najda

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterFragmentActivity

// FlutterFragmentActivity (not FlutterActivity): local_auth shows the biometric
// prompt as a fragment dialog and needs a FragmentActivity host.
class MainActivity : FlutterFragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannels()
    }

    /**
     * The backend names one of these channels on every push. They must exist
     * on the device before the first push arrives, or Android falls back to a
     * silent default. Safe to run on every start (re-creating is a no-op).
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)

        manager.createNotificationChannel(
            NotificationChannel(
                "najda_urgent",
                "Urgent alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "New missions and emergencies that need immediate action." }
        )
        manager.createNotificationChannel(
            NotificationChannel(
                "najda_updates",
                "Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Progress on your report, messages and account updates." }
        )
    }
}
