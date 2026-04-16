package org.example

import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import org.example.firebase.FirebaseService
import org.example.models.FavouriteEvent
import org.example.models.Event
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FavouriteEventIntegrationTest {

    @BeforeTest
    fun setup() {
        FirebaseService.initialize()
    }

    @Test
    fun testEventFavouriteIsolation() = testApplication {
        application {
            configurePlugins()
            configureRouting()
        }

        val client = createClient {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }

        val userA = "user_A_${System.currentTimeMillis()}"
        val userB = "user_B_${System.currentTimeMillis()}"

        // 1. Create two test events
        val event1Req = Event(name = "Event 1", category = "culture")
        val event2Req = Event(name = "Event 2", category = "sport")

        val event1Id = client.post("/api/events") { contentType(ContentType.Application.Json); setBody(event1Req) }.body<Event>().id
        val event2Id = client.post("/api/events") { contentType(ContentType.Application.Json); setBody(event2Req) }.body<Event>().id

        try {
            // 2. User A likes Event 1
            client.post("/api/favourites/events") {
                contentType(ContentType.Application.Json)
                setBody(FavouriteEvent(userId = userA, eventId = event1Id))
            }

            // 3. User B likes Event 2
            client.post("/api/favourites/events") {
                contentType(ContentType.Application.Json)
                setBody(FavouriteEvent(userId = userB, eventId = event2Id))
            }

            // 4. Verify User A only sees Event 1
            val resARaw = client.get("/api/favourites/events/$userA")
            assertEquals(HttpStatusCode.OK, resARaw.status, "User A GET status should be 200")
            val resA = resARaw.body<List<Event>>()
            assertEquals(1, resA.size, "User A should have exactly 1 favorite")
            assertEquals(event1Id, resA[0].id)

            // 5. Verify User B only sees Event 2
            val resBRaw = client.get("/api/favourites/events/$userB")
            assertEquals(HttpStatusCode.OK, resBRaw.status, "User B GET status should be 200")
            val resB = resBRaw.body<List<Event>>()
            assertEquals(1, resB.size, "User B should have exactly 1 favorite")
            assertEquals(event2Id, resB[0].id)

            // 6. User A also likes Event 2
            client.post("/api/favourites/events") {
                contentType(ContentType.Application.Json)
                setBody(FavouriteEvent(userId = userA, eventId = event2Id))
            }
            val resAUpdated = client.get("/api/favourites/events/$userA").body<List<Event>>()
            assertEquals(2, resAUpdated.size, "User A should now have 2 favorites")

        } finally {
            // Cleanup events
            client.delete("/api/events/$event1Id")
            client.delete("/api/events/$event2Id")
            // Cleanup favorites for these users (optional, but good for real DB if needed)
            // Backend currently deletes by user_id + event_id combination in the delete route
            client.delete("/api/favourites/events") {
                contentType(ContentType.Application.Json)
                setBody(FavouriteEvent(userId = userA, eventId = event1Id))
            }
            client.delete("/api/favourites/events") {
                contentType(ContentType.Application.Json)
                setBody(FavouriteEvent(userId = userA, eventId = event2Id))
            }
            client.delete("/api/favourites/events") {
                contentType(ContentType.Application.Json)
                setBody(FavouriteEvent(userId = userB, eventId = event2Id))
            }
        }
    }
}
