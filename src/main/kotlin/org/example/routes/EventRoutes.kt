package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import com.google.cloud.Timestamp
import com.google.cloud.firestore.QueryDocumentSnapshot
import org.example.firebase.FirebaseService
import org.example.models.Event
import org.example.database.withLogging
import java.time.Instant

fun Route.eventRoutes() {
    val collection = "Events"

    fun docToEvent(doc: QueryDocumentSnapshot): Event {
        fun getStringOrTimestamp(field: String): String? {
            return try {
                val value = doc.get(field)
                when (value) {
                    is Timestamp -> {
                        // Firebase Timestamp.toString() returns a string like "Timestamp(seconds=..., nanos=...)"
                        // We want ISO 8601 string for the frontend
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

    fun String.toTimestamp(): Timestamp? {
        if (this.isBlank()) return null
        return try {
            val iso = if (!this.contains("Z") && this.contains("T")) {
                if (this.length == 16) "${this}:00Z" else "${this}Z"
            } else if (!this.contains("T")) {
                "${this}T00:00:00Z"
            } else {
                this
            }
            val instant = Instant.parse(iso)
            Timestamp.ofTimeSecondsAndNanos(instant.epochSecond, instant.nano)
        } catch (e: Exception) {
            null
        }
    }

    route("/api/events") {
        get {
            val categoryParam = call.request.queryParameters["category"]
            val categories = categoryParam?.split(",")?.map { it.trim().lowercase() }?.filter { it.isNotBlank() && it != "all" } ?: emptyList()
            
            val date = call.request.queryParameters["date"] // Expected format like YYYY-MM-DD
            val queryParam = call.request.queryParameters["query"]?.lowercase()
            val minPrice = call.request.queryParameters["minPrice"]?.toDoubleOrNull()
            val maxPrice = call.request.queryParameters["maxPrice"]?.toDoubleOrNull()

            val events = withLogging("GET filtered events") {
                var firestoreQuery: com.google.cloud.firestore.Query = FirebaseService.firestore.collection(collection)
                
                // Firestore IN query for multiple categories (supports up to 10 elements)
                if (categories.isNotEmpty()) {
                    firestoreQuery = firestoreQuery.whereIn("category", categories)
                }

                val documents = firestoreQuery.get().get()
                var filtered = documents.map { docToEvent(it) }

                // In-memory filter for date substring match (simplest approach for complex Timestamp mappings)
                if (!date.isNullOrBlank()) {
                    filtered = filtered.filter { 
                        it.startTime?.contains(date) == true || it.time?.contains(date) == true
                    }
                }

                // In-memory filter for text search (name or description, case-insensitive)
                if (!queryParam.isNullOrBlank()) {
                    filtered = filtered.filter { 
                        it.name?.lowercase()?.contains(queryParam) == true || 
                        it.description?.lowercase()?.contains(queryParam) == true 
                    }
                }
                
                // In-memory filter for price: always show if no price, otherwise check range
                if (minPrice != null || maxPrice != null) {
                    filtered = filtered.filter {
                        val priceStr = it.price
                        if (priceStr.isNullOrBlank()) {
                            true // No price = always show
                        } else {
                            val priceVal = Regex("[0-9.]+").find(priceStr)?.value?.toDoubleOrNull() ?: 0.0
                            val meetsMin = minPrice == null || priceVal >= minPrice
                            val meetsMax = maxPrice == null || priceVal <= maxPrice
                            meetsMin && meetsMax
                        }
                    }
                }
                
                filtered
            }
            call.respond(events)
        }

        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val event = withLogging("GET event $id") {
                val doc = FirebaseService.firestore.collection(collection).document(id).get().get()
                if (!doc.exists()) {
                    null
                } else {
                    docToEvent(doc as QueryDocumentSnapshot)
                }
            }
            if (event == null) {
                call.respond(HttpStatusCode.NotFound, "Event not found")
            } else {
                call.respond(event)
            }
        }

        post {
            val event = call.receive<Event>()
            val docRef = FirebaseService.firestore.collection(collection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "name" to event.name,
                "description" to event.description,
                "geopositionId" to event.geopositionId,
                "organizerId" to event.organizerId,
                "startTime" to event.startTime?.toTimestamp(),
                "endTime" to event.endTime?.toTimestamp(),
                "price" to event.price,
                "category" to event.category,
                "imageUri" to event.imageUri
            )
            withLogging("POST event") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, event.copy(id = docRef.id))
        }

        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val event = call.receive<Event>()
            val data: Map<String, Any?> = mapOf(
                "id" to id,
                "name" to event.name,
                "description" to event.description,
                "geopositionId" to event.geopositionId,
                "organizerId" to event.organizerId,
                "startTime" to event.startTime?.toTimestamp(),
                "endTime" to event.endTime?.toTimestamp(),
                "price" to event.price,
                "category" to event.category,
                "imageUri" to event.imageUri
            )
            withLogging("PUT event $id") {
                FirebaseService.firestore.collection(collection).document(id).set(data).get()
            }
            call.respond(HttpStatusCode.OK, event.copy(id = id))
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            withLogging("DELETE event $id") {
                FirebaseService.firestore.collection(collection).document(id).delete().get()
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
