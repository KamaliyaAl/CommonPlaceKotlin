package org.example

import com.google.api.core.ApiFutures
import com.google.cloud.firestore.CollectionReference
import com.google.cloud.firestore.DocumentReference
import com.google.cloud.firestore.DocumentSnapshot
import com.google.cloud.firestore.Firestore
import com.google.cloud.firestore.QueryDocumentSnapshot
import com.google.cloud.firestore.QuerySnapshot
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import io.mockk.every
import io.mockk.mockk
import kotlinx.serialization.json.Json
import org.example.firebase.FirebaseService
import org.example.models.Profile
import org.example.models.LoginRequest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals

class ProfileIntegrationTest {

    @BeforeTest
    fun setup() {
        FirebaseService.initialize()
    }

    @Test
    fun testProfileLifecycle() = testApplication {
        application {
            configurePlugins()
            configureRouting()
        }

        val client = createClient {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }

        val testEmail = "test_profile_${System.currentTimeMillis()}@example.com"
        val testPassword = "password123"

        // 1. Create a new profile via Account route
        val profileReq = Profile(
            name = "Integration Test User",
            email = testEmail,
            password = testPassword,
            age = 25,
            gender = true
        )

        val createRes = client.post("/api/account") {
            contentType(ContentType.Application.Json)
            setBody(profileReq)
        }
        assertEquals(HttpStatusCode.Created, createRes.status)
        val createdProfile = createRes.body<Profile>()
        val profileId = createdProfile.id

        try {
            // 2. Test Login
            val loginReq = LoginRequest(testEmail, testPassword)
            val loginRes = client.post("/api/profiles/login") {
                contentType(ContentType.Application.Json)
                setBody(loginReq)
            }
            assertEquals(HttpStatusCode.OK, loginRes.status)
            val loggedInProfile = loginRes.body<Profile>()
            assertEquals(profileId, loggedInProfile.id)

            // 3. Test GET profile by ID
            val getRes = client.get("/api/profiles/$profileId")
            assertEquals(HttpStatusCode.OK, getRes.status)
            assertEquals("Integration Test User", getRes.body<Profile>().name)

            // 4. Test PUT update profile
            val updateReq = profileReq.copy(name = "Updated Name")
            val putRes = client.put("/api/account/$profileId") {
                contentType(ContentType.Application.Json)
                setBody(updateReq)
            }
            assertEquals(HttpStatusCode.OK, putRes.status)
            
            // Verify update
            val getUpdatedRes = client.get("/api/profiles/$profileId")
            assertEquals("Updated Name", getUpdatedRes.body<Profile>().name)

        } finally {
            // 5. Cleanup: DELETE profile
            val deleteRes = client.delete("/api/account/$profileId")
            assertEquals(HttpStatusCode.NoContent, deleteRes.status)
        }
    }

    @Test
    fun testFirebaseInitialization() {
        // Simple sanity check that initialize doesn't throw
        FirebaseService.initialize()
    }
}
