package org.example.routes

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.FavouriteEvent
import org.example.models.FavouritePlace
import org.example.models.Location
import org.example.models.Event
import org.example.models.PlaceEntry
import org.example.database.withLogging
import com.google.cloud.Timestamp
import java.time.Instant
import com.google.cloud.firestore.DocumentSnapshot

fun Route.favouriteRoutes() {
    val favouriteEventsCollection = "favourite_events"
    val favouritePlacesCollection = "favourite_places"
    val eventsCollection = "Events"
    val placeEntriesCollection = "place_entries"

    fun docToEvent(doc: DocumentSnapshot): Event {
        fun getStringOrTimestamp(field: String): String? {
            return try {
                val value = doc.get(field)
                when (value) {
                    is Timestamp -> {
                        val instant = Instant.ofEpochSecond(value.seconds, value.nanos.toLong())
                        instant.toString()
                    }
                    is String -> value
                    else -> null
                }
            } catch (e: Exception) {
                null
            }
        }

        return Event(
            id = doc.id,
            name = doc.getString("name"),
            description = doc.getString("description"),
            geopositionId = doc.getString("geopositionId"),
            organizerId = doc.getString("organizerId"),
            startTime = getStringOrTimestamp("startTime"),
            endTime = getStringOrTimestamp("endTime"),
            price = doc.getString("price"),
            category = doc.getString("category"),
            imageUri = doc.getString("imageUri")
        )
    }

    route("/api/favourites") {
        // Favorite Events
        route("/events") {
            get("/{userId}") {
                val userId = call.parameters["userId"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest, "Missing userId"
                )
                
                val fullEvents = withLogging("GET full favourite events for $userId") {
                    val favDocs = FirebaseService.firestore.collection(favouriteEventsCollection)
                        .whereEqualTo("user_id", userId).get().get()
                    
                    val eventIds = favDocs.map { 
                        it.getString("event_id") ?: it.getString("location_id") ?: "" 
                    }.filter { it.isNotEmpty() }
                    
                    eventIds.mapNotNull { eventId ->
                        val doc = FirebaseService.firestore.collection(eventsCollection).document(eventId).get().get()
                        if (doc.exists()) {
                            docToEvent(doc)
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
                    "location_id" to fav.eventId, // save as both for compatibility
                    "favourite" to true
                )
                withLogging("POST favourite event $data") {
                    docRef.set(data).get()
                }
                call.respond(HttpStatusCode.Created, fav.copy(id = docRef.id, favourite = true))
            }

            delete {
                val fav = call.receive<FavouriteEvent>()
                withLogging("DELETE favourite event for user ${fav.userId}") {
                    val favCollection = FirebaseService.firestore.collection(favouriteEventsCollection)

                    // Try finding by event_id
                    var documents = favCollection
                        .whereEqualTo("user_id", fav.userId)
                        .whereEqualTo("event_id", fav.eventId)
                        .get().get()

                    // Fallback to location_id if nothing found (compatibility with manual db naming)
                    if (documents.isEmpty) {
                        documents = favCollection
                            .whereEqualTo("user_id", fav.userId)
                            .whereEqualTo("location_id", fav.eventId) // we use eventId as locationId in this case
                            .get().get()
                    }

                    documents.forEach { doc -> doc.reference.delete().get() }
                }
                call.respond(HttpStatusCode.NoContent)
            }
        }

        // Favorite Places
        route("/places") {
            get("/{userId}") {
                val userId = call.parameters["userId"] ?: return@get call.respond(
                    HttpStatusCode.BadRequest, "Missing userId"
                )

                val places = withLogging("GET favourite places for $userId") {
                    val favDocs = FirebaseService.firestore.collection(favouritePlacesCollection)
                        .whereEqualTo("user_id", userId).get().get()

                    val placeIds = favDocs.map { it.getString("place_id") ?: "" }.filter { it.isNotEmpty() }

                    placeIds.mapNotNull { placeId ->
                        val doc = FirebaseService.firestore.collection(placeEntriesCollection).document(placeId).get().get()
                        if (doc.exists()) {
                            PlaceEntry(
                                id = doc.id,
                                name = doc.getString("name"),
                                description = doc.getString("description"),
                                category = doc.getString("category"),
                                address = doc.getString("address"),
                                phone = doc.getString("phone"),
                                website = doc.getString("website"),
                                openingHours = doc.getString("openingHours"),
                                latitude = doc.getDouble("latitude") ?: 0.0,
                                longitude = doc.getDouble("longitude") ?: 0.0,
                                imageUri = doc.getString("imageUri"),
                                organizerId = doc.getString("organizerId")
                            )
                        } else null
                    }
                }
                call.respond(places)
            }

            post {
                val fav = call.receive<FavouritePlace>()
                val docRef = FirebaseService.firestore.collection(favouritePlacesCollection).document()
                val data: Map<String, Any?> = mapOf(
                    "id" to docRef.id,
                    "user_id" to fav.userId,
                    "place_id" to fav.placeId,
                    "favourite" to true
                )
                withLogging("POST favourite place $data") {
                    docRef.set(data).get()
                }
                call.respond(HttpStatusCode.Created, fav.copy(id = docRef.id, favourite = true))
            }

            delete {
                val fav = call.receive<FavouritePlace>()
                withLogging("DELETE favourite place for user ${fav.userId}") {
                    val documents = FirebaseService.firestore.collection(favouritePlacesCollection)
                        .whereEqualTo("user_id", fav.userId)
                        .whereEqualTo("place_id", fav.placeId)
                        .get().get()
                    documents.forEach { doc -> doc.reference.delete().get() }
                }
                call.respond(HttpStatusCode.NoContent)
            }
        }
    }
}
