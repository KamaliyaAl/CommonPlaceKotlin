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
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class ProfileIntegrationTest {

    private lateinit var mockFirestore: Firestore
    private lateinit var mockCollection: CollectionReference

    @BeforeTest
    fun setup() {
        mockFirestore = mockk(relaxed = true)
        mockCollection = mockk(relaxed = true)
        
        // Mock the basic firestore interactions
        every { mockFirestore.collection("Profile") } returns mockCollection
    }

    @Test
    fun testAddAndGetProfileWithMock() = testApplication {
        // Manually set the mock firestore to avoid real connection issues in CI
        FirebaseService.firestore = mockFirestore

        // Configure the test application
        application {
            configurePlugins()
            configureRouting()
        }

        val client = createClient {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }

        // 1. Mock POST behavior
        val mockDocRef = mockk<DocumentReference>()
        every { mockDocRef.id } returns "test-id-123"
        every { mockCollection.document() } returns mockDocRef
        every { mockDocRef.set(any()) } returns ApiFutures.immediateFuture(null)

        // 2. Mock GET (all) behavior
        val mockQuerySnapshot = mockk<QuerySnapshot>()
        every { mockQuerySnapshot.iterator() } returns mutableListOf<QueryDocumentSnapshot>().iterator()
        every { mockCollection.get() } returns ApiFutures.immediateFuture(mockQuerySnapshot)

        // 3. Mock GET (by ID) behavior
        val mockDocSnapshot = mockk<DocumentSnapshot>()
        every { mockDocSnapshot.exists() } returns true
        every { mockDocSnapshot.id } returns "test-id-123"
        every { mockDocSnapshot.getString("name") } returns "Test User"
        every { mockDocSnapshot.getLong("age") } returns 30L
        every { mockDocSnapshot.getBoolean("gender") } returns true
        every { mockDocSnapshot.getString("email") } returns "test@example.com"
        every { mockDocSnapshot.getString("password") } returns "securepassword"
        every { mockDocSnapshot.getBoolean("isAdmin") } returns false
        
        val mockGetDocRef = mockk<DocumentReference>()
        every { mockCollection.document("test-id-123") } returns mockGetDocRef
        every { mockGetDocRef.get() } returns ApiFutures.immediateFuture(mockDocSnapshot)

        // --- Execution ---

        // Test POST /api/profiles
        val newProfile = Profile(
            name = "Test User",
            age = 30,
            gender = true,
            email = "test@example.com",
            password = "securepassword"
        )

        val postResponse = client.post("/api/profiles") {
            contentType(ContentType.Application.Json)
            setBody(newProfile)
        }

        assertEquals(HttpStatusCode.Created, postResponse.status)
        val createdProfile = postResponse.body<Profile>()
        assertEquals("test-id-123", createdProfile.id)

        // Test GET /api/profiles/{id}
        val getResponse = client.get("/api/profiles/test-id-123")
        assertEquals(HttpStatusCode.OK, getResponse.status)
        val fetchedProfile = getResponse.body<Profile>()
        assertEquals("Test User", fetchedProfile.name)
        assertEquals("test-id-123", fetchedProfile.id)
    }

    @Test
    fun testAccountEndpoints() = testApplication {
        FirebaseService.firestore = mockFirestore
        application {
            configurePlugins()
            configureRouting()
        }
        val client = createClient {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }

        // Mock for signup (email search)
        val mockQuerySnapshot = mockk<QuerySnapshot>()
        every { mockQuerySnapshot.isEmpty } returns true
        every { mockCollection.whereEqualTo("email", "new@example.com").get() } returns ApiFutures.immediateFuture(mockQuerySnapshot)
        
        val mockDocRef = mockk<DocumentReference>()
        every { mockDocRef.id } returns "new-id"
        every { mockCollection.document() } returns mockDocRef
        every { mockDocRef.set(any()) } returns ApiFutures.immediateFuture(null)

        // 1. POST /api/account
        val newProfile = Profile(name = "New User", email = "new@example.com", password = "password")
        val postResponse = client.post("/api/account") {
            contentType(ContentType.Application.Json)
            setBody(newProfile)
        }
        assertEquals(HttpStatusCode.Created, postResponse.status)
        assertEquals("new-id", postResponse.body<Profile>().id)

        // 2. PUT /api/account/{id}
        val mockDocSnapshot = mockk<DocumentSnapshot>()
        every { mockDocSnapshot.exists() } returns true
        every { mockDocSnapshot.getBoolean("isAdmin") } returns false
        val mockGetDocRef = mockk<DocumentReference>()
        every { mockCollection.document("new-id") } returns mockGetDocRef
        every { mockGetDocRef.get() } returns ApiFutures.immediateFuture(mockDocSnapshot)
        every { mockGetDocRef.set(any()) } returns ApiFutures.immediateFuture(null)

        val putResponse = client.put("/api/account/new-id") {
            contentType(ContentType.Application.Json)
            setBody(newProfile.copy(name = "Updated User"))
        }
        assertEquals(HttpStatusCode.OK, putResponse.status)

        // 3. DELETE /api/account/{id}
        every { mockGetDocRef.delete() } returns ApiFutures.immediateFuture(null)
        val deleteResponse = client.delete("/api/account/new-id")
        assertEquals(HttpStatusCode.NoContent, deleteResponse.status)
    }

    @Test
    fun testFirebaseInitializationWithEmulatorProperty() {
        // Set emulator host via system property
        System.setProperty("FIRESTORE_EMULATOR_HOST", "localhost:8081")
        
        // This should not throw even if no emulator is running
        FirebaseService.initialize()
        
        // Cleanup
        System.clearProperty("FIRESTORE_EMULATOR_HOST")
    }
}
