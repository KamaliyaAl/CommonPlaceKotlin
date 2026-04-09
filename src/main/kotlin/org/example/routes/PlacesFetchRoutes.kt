package org.example.routes

import io.ktor.http.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.services.GooglePlacesService

fun Routing.placesRoutes() {

    /**
     * POST /api/admin/places/fetch
     *
     * Triggers a Google Places API fetch for event-related venues in Cyprus
     * and stores new results in the Firestore "Events" collection.
     *
     * Already-imported places (identified by their Google Place ID) are skipped
     * automatically, so this endpoint is safe to call multiple times.
     *
     * Requires GOOGLE_PLACES_API_KEY to be set in .env.local.
     *
     * Response 200:
     * {
     *   "stored": 12,
     *   "skipped": 3,
     *   "errors": 0,
     *   "message": "Done — 12 stored, 3 skipped (duplicates), 0 errors"
     * }
     */
    post("/api/admin/places/fetch") {
        val result = GooglePlacesService.fetchAndStoreEvents()
        val status = if (result.stored > 0 || result.skipped >= 0) HttpStatusCode.OK
        else HttpStatusCode.InternalServerError
        call.respond(status, result)
    }
}
