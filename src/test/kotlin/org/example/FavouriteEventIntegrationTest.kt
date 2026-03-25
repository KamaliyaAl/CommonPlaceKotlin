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
    fun testEventFavouriteLifecycle() = testApplication {
        application {
            configurePlugins()
            configureRouting()
        }

        val client = createClient {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }

        val testUserId = "test_user_${System.currentTimeMillis()}"

        // 1. Create a temporary event
        val tempEvent = Event(name = "Test Event", description = "Test Description", category = "culture")
        val eventResponse = client.post("/api/events") {
            contentType(ContentType.Application.Json)
            setBody(tempEvent)
        }
        val createdEvent = eventResponse.body<Event>()
        val eventId = createdEvent.id

        try {
            // 2. Add to Favourites
            val favReq = FavouriteEvent(userId = testUserId, eventId = eventId)
            val postResponse = client.post("/api/favourites/events") {
                contentType(ContentType.Application.Json)
                setBody(favReq)
            }
            assertEquals(HttpStatusCode.Created, postResponse.status)

            // 3. Get Favourites
            val getResponse = client.get("/api/favourites/events/$testUserId")
            assertEquals(HttpStatusCode.OK, getResponse.status)
            
            val favouriteEvents = getResponse.body<List<Event>>()
            assertTrue(favouriteEvents.any { it.id == eventId }, "Favourite event should be in the list")

            // 4. Remove
            client.delete("/api/favourites/events") {
                contentType(ContentType.Application.Json)
                setBody(favReq)
            }

        } finally {
            client.delete("/api/events/$eventId")
        }
    }
}
