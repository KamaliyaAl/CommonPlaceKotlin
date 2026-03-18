package org.example.routes

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.FavouriteLocation
import org.example.models.FavouriteEvent
import org.example.models.Location
import org.example.models.Event
import org.example.database.withLogging

fun Route.favouriteRoutes() {
    val favouriteLocationsCollection = "favourite_locations"
    val favouriteEventsCollection = "favourite_events"
    val locationsCollection = "locations"
    val eventsCollection = "Events"

    route("/api/favourites") {
        
        // Favorite Locations (Places)
        route("/locations") {
            // Get full location details for a user's favorites
            get("/{userId}") {
                val userId = call.parameters["userId"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest, "Missing userId"
                )
                
                val fullLocations = withLogging("GET full favourite locations for $userId") {
                    val favDocs = FirebaseService.firestore.collection(favouriteLocationsCollection)
                        .whereEqualTo("user_id", userId).get().get()
                    
                    val locationIds = favDocs.map { it.getString("location_id") ?: "" }.filter { it.isNotEmpty() }
                    
                    locationIds.mapNotNull { locId ->
                        val doc = FirebaseService.firestore.collection(locationsCollection).document(locId).get().get()
                        if (doc.exists()) {
                            Location(
                                id = doc.id,
                                geopositionId = doc.getString("geopositionId"),
                                description = doc.getString("description")
                            )
                        } else null
                    }
                }
                call.respond(fullLocations)
            }

            post {
                val fav = call.receive<FavouriteLocation>()
                if (fav.userId.isEmpty() || fav.locationId.isEmpty()) {
                    return@post call.respond(HttpStatusCode.BadRequest, "Missing userId or locationId")
                }
                
                val docRef = FirebaseService.firestore.collection(favouriteLocationsCollection).document()
                val data: Map<String, Any?> = mapOf(
                    "id" to docRef.id,
                    "user_id" to fav.userId,
                    "location_id" to fav.locationId,
                    "favourite" to true
                )
                withLogging("POST favourite location $data") {
                    docRef.set(data).get()
                }
                call.respond(HttpStatusCode.Created, fav.copy(id = docRef.id, favourite = true))
            }

            delete {
                val fav = call.receive<FavouriteLocation>()
                withLogging("DELETE favourite location for user ${fav.userId}") {
                    val documents = FirebaseService.firestore.collection(favouriteLocationsCollection)
                        .whereEqualTo("user_id", fav.userId)
                        .whereEqualTo("location_id", fav.locationId)
                        .get().get()
                    documents.forEach { doc -> doc.reference.delete().get() }
                }
                call.respond(HttpStatusCode.NoContent)
            }
        }

        // Favorite Events
        route("/events") {
            get("/{userId}") {
                val userId = call.parameters["userId"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest, "Missing userId"
                )
                
                val fullEvents = withLogging("GET full favourite events for $userId") {
                    val favDocs = FirebaseService.firestore.collection(favouriteEventsCollection)
                        .whereEqualTo("user_id", userId).get().get()
                    
                    val eventIds = favDocs.map { it.getString("event_id") ?: "" }.filter { it.isNotEmpty() }
                    
                    eventIds.mapNotNull { eventId ->
                        val doc = FirebaseService.firestore.collection(eventsCollection).document(eventId).get().get()
                        if (doc.exists()) {
                            Event(
                                id = doc.id,
                                name = doc.getString("name"),
                                description = doc.getString("description"),
                                geopositionId = doc.getString("geopositionId"),
                                organizerId = doc.getString("organizerId"),
                                time = doc.getString("time")
                            )
                        } else null
                    }
                }
                call.respond(fullEvents)
            }

            post {
                val fav = call.receive<FavouriteEvent>()
                val docRef = FirebaseService.firestore.collection(favouriteEventsCollection).document()
                val data: Map<String, Any?> = mapOf(
                    "id" to docRef.id,
                    "user_id" to fav.userId,
                    "event_id" to fav.eventId,
                    "favourite" to true
                )
                withLogging("POST favourite event") {
                    docRef.set(data).get()
                }
                call.respond(HttpStatusCode.Created, fav.copy(id = docRef.id, favourite = true))
            }

            delete {
                val fav = call.receive<FavouriteEvent>()
                withLogging("DELETE favourite event") {
                    val documents = FirebaseService.firestore.collection(favouriteEventsCollection)
                        .whereEqualTo("user_id", fav.userId)
                        .whereEqualTo("event_id", fav.eventId)
                        .get().get()
                    documents.forEach { doc -> doc.reference.delete().get() }
                }
                call.respond(HttpStatusCode.NoContent)
            }
        }
    }
}
