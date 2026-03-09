package org.example.firebase

import com.google.auth.oauth2.GoogleCredentials
import com.google.auth.oauth2.ServiceAccountCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.cloud.FirestoreClient
import com.google.cloud.firestore.Firestore
import io.github.cdimascio.dotenv.dotenv
import org.slf4j.LoggerFactory
import java.io.FileInputStream
import java.io.File

object FirebaseService {
    private val logger = LoggerFactory.getLogger(FirebaseService::class.java)

    private val dotenv = dotenv {
        filename = ".env.local"
        ignoreIfMissing = true
    }

    // Firebase config values are loaded from .env.local, mirroring the frontend's Web Config
    val apiKey: String? = dotenv["VITE_FIREBASE_API_KEY"]
    val authDomain: String? = dotenv["VITE_FIREBASE_AUTH_DOMAIN"]
    val projectId: String = dotenv["VITE_FIREBASE_PROJECT_ID"] ?: "commonplace1"
    val storageBucket: String? = dotenv["VITE_FIREBASE_STORAGE_BUCKET"]
    val messagingSenderId: String? = dotenv["VITE_FIREBASE_MESSAGING_SENDER_ID"]
    val appId: String? = dotenv["VITE_FIREBASE_APP_ID"]
    val measurementId: String? = dotenv["VITE_FIREBASE_MEASUREMENT_ID"]

    lateinit var firestore: Firestore
        set

    fun initialize() {
        if (FirebaseApp.getApps().isEmpty()) {
            val optionsBuilder = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(FileInputStream(File("commonplace1-firebase-adminsdk-fbsvc-fa57a72c94.json"))))
                .setProjectId(projectId)
                .setStorageBucket(storageBucket)

            FirebaseApp.initializeApp(optionsBuilder.build())
            firestore = FirestoreClient.getFirestore()
        } else {
            if (!this::firestore.isInitialized) {
                firestore = FirestoreClient.getFirestore()
            }
        }
    }
}
