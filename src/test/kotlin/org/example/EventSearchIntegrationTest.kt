package org.example

import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import org.example.firebase.FirebaseService
import org.example.models.Event
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EventSearchIntegrationTest {

    @BeforeTest
    fun setup() {
        FirebaseService.initialize()
    }

    @Test
    fun testEventLifecycleAndSearchFiltering() = testApplication {
        application {
            configurePlugins()
            configureRouting()
        }

        val client = createClient {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }

        val testMarker = "TEST_SEARCH_${System.currentTimeMillis()}"
        val testOrganizerId = "organizer_${System.currentTimeMillis()}"

        // 1. Test Event Creation with specific parameters
        val event1 = Event(
            name = "$testMarker Beach Party",
            description = "Fun in the sun",
            category = "nature",
            startTime = "2026-05-10T14:00:00Z",
            price = "15",
            organizerId = testOrganizerId,
            imageUri = "http://test.com/img1.jpg"
        )
        val postRes = client.post("/api/events") {
            contentType(ContentType.Application.Json)
            setBody(event1)
        }
        assertEquals(HttpStatusCode.Created, postRes.status)
        val createdEvent1 = postRes.body<Event>()
        assertEquals(testOrganizerId, createdEvent1.organizerId, "Event should be created with correct organizerId")
        assertEquals("15", createdEvent1.price)
        val id1 = createdEvent1.id

        // Create mock events for search/filter testing
        val event2 = Event(
            name = "$testMarker Board Games",
            category = "culture",
            startTime = "2026-05-11T18:00:00Z",
            price = "5",
            organizerId = "other_organizer"
        )
        val event3 = Event(
            name = "$testMarker Sports Day",
            category = "sport",
            startTime = "2026-05-10T09:00:00Z",
            price = "40",
            organizerId = testOrganizerId
        )

        val id2 = client.post("/api/events") { contentType(ContentType.Application.Json); setBody(event2) }.body<Event>().id
        val id3 = client.post("/api/events") { contentType(ContentType.Application.Json); setBody(event3) }.body<Event>().id

        try {
            // 2. Filter by organicerId
            val organizerRes = client.get("/api/events?organizerId=$testOrganizerId")
            val organizerEvents = organizerRes.body<List<Event>>()
            // Should find event1 and event3
            assertTrue(organizerEvents.any { it.id == id1 })
            assertTrue(organizerEvents.any { it.id == id3 })
            assertTrue(organizerEvents.none { it.id == id2 })

            // 3. Test filter by category
            val catRes = client.get("/api/events?query=$testMarker&category=nature")
            val catEvents = catRes.body<List<Event>>()
            assertEquals(1, catEvents.size)
            assertEquals(id1, catEvents[0].id)

            // 4. Test filter by price range (Max 20)
            val maxPriceRes = client.get("/api/events?query=$testMarker&maxPrice=20")
            val maxPriceEvents = maxPriceRes.body<List<Event>>()
            assertTrue(maxPriceEvents.any { it.id == id1 })
            assertTrue(maxPriceEvents.any { it.id == id2 })
            assertTrue(maxPriceEvents.none { it.id == id3 })

            // 5. Test filter by date substring
            val dateRes = client.get("/api/events?query=$testMarker&date=2026-05-10")
            val dateEvents = dateRes.body<List<Event>>()
            assertEquals(2, dateEvents.size)
            assertTrue(dateEvents.any { it.id == id1 })
            assertTrue(dateEvents.any { it.id == id3 })

        } finally {
            // Cleanup
            client.delete("/api/events/$id1")
            client.delete("/api/events/$id2")
            client.delete("/api/events/$id3")
        }
    }
}
