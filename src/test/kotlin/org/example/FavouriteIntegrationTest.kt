package org.example

import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import org.example.firebase.FirebaseService
import org.example.models.FavouriteLocation
import org.example.models.Location
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FavouriteIntegrationTest {

    @BeforeTest
    fun setup() {
        // Initialize real Firebase
        FirebaseService.initialize()
    }

    @Test
    fun testRealFavouriteLifecycle() = testApplication {
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

        // 1. Create a temporary location for testing GET full details
        val tempLoc = Location(description = "Test Location for Integration")
        val locResponse = client.post("/api/locations") {
            contentType(ContentType.Application.Json)
            setBody(tempLoc)
        }
        val createdLoc = locResponse.body<Location>()
        val locId = createdLoc.id

        try {
            // 2. Add to Favourites
            val favReq = FavouriteLocation(userId = testUserId, locationId = locId)
            val postResponse = client.post("/api/favourites/locations") {
                contentType(ContentType.Application.Json)
                setBody(favReq)
            }
            assertEquals(HttpStatusCode.Created, postResponse.status)

            // 3. Get Favourites (Full Details)
            val getResponse = client.get("/api/favourites/locations/$testUserId")
            assertEquals(HttpStatusCode.OK, getResponse.status)
            
            val favouriteLocations = getResponse.body<List<Location>>()
            assertTrue(favouriteLocations.any { it.id == locId }, "Favourite location should be in the list")
            assertEquals("Test Location for Integration", favouriteLocations.first { it.id == locId }.description)

            // 4. Remove from Favourites
            val deleteResponse = client.delete("/api/favourites/locations") {
                contentType(ContentType.Application.Json)
                setBody(favReq)
            }
            assertEquals(HttpStatusCode.NoContent, deleteResponse.status)

            // 5. Verify it's gone
            val getResponseAfter = client.get("/api/favourites/locations/$testUserId")
            val favouriteLocationsAfter = getResponseAfter.body<List<Location>>()
            assertTrue(favouriteLocationsAfter.none { it.id == locId }, "Favourite location should be removed")

        } finally {
            // Cleanup: remove the temporary location
            client.delete("/api/locations/$locId")
        }
    }
}
