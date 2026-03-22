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
    fun testEventSearchFiltering() = testApplication {
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

        // Create mock events
        val event1 = Event(
            name = "$testMarker Beach Party",
            description = "Fun in the sun",
            category = "nature",
            startTime = "2026-05-10T14:00:00Z"
        )
        val event2 = Event(
            name = "$testMarker Board Games",
            description = "Indoor fun",
            category = "culture",
            startTime = "2026-05-11T18:00:00Z"
        )
        val event3 = Event(
            name = "$testMarker Sports Day",
            description = "Outdoor sports event full of fun",
            category = "sport",
            startTime = "2026-05-10T09:00:00Z"
        )

        val id1 = client.post("/api/events") { contentType(ContentType.Application.Json); setBody(event1) }.body<Event>().id
        val id2 = client.post("/api/events") { contentType(ContentType.Application.Json); setBody(event2) }.body<Event>().id
        val id3 = client.post("/api/events") { contentType(ContentType.Application.Json); setBody(event3) }.body<Event>().id

        try {
            // 1. Test fetch all test marker events
            val allRes = client.get("/api/events?query=$testMarker")
            assertEquals(HttpStatusCode.OK, allRes.status)
            val allEvents = allRes.body<List<Event>>()
            assertEquals(3, allEvents.size)

            // 2. Test filter by category
            val catRes = client.get("/api/events?query=$testMarker&category=nature")
            val catEvents = catRes.body<List<Event>>()
            assertEquals(1, catEvents.size)
            assertEquals(id1, catEvents[0].id)

            // 3. Test filter by multiple categories
            val multiCatRes = client.get("/api/events?query=$testMarker&category=nature,culture")
            val multiCatEvents = multiCatRes.body<List<Event>>()
            assertEquals(2, multiCatEvents.size)
            assertTrue(multiCatEvents.any { it.id == id1 })
            assertTrue(multiCatEvents.any { it.id == id2 })

            // 4. Test filter by date substring
            val dateRes = client.get("/api/events?query=$testMarker&date=2026-05-10")
            val dateEvents = dateRes.body<List<Event>>()
            assertEquals(2, dateEvents.size)
            assertTrue(dateEvents.any { it.id == id1 })
            assertTrue(dateEvents.any { it.id == id3 })

            // 4. Test text search (case insensitive in description)
            val textRes = client.get("/api/events?query=indoor")
            val textEvents = textRes.body<List<Event>>()
            // It should at least find event2 since it has 'indoor'
            assertTrue(textEvents.any { it.id == id2 })

        } finally {
            // Cleanup
            client.delete("/api/events/$id1")
            client.delete("/api/events/$id2")
            client.delete("/api/events/$id3")
        }
    }
}
