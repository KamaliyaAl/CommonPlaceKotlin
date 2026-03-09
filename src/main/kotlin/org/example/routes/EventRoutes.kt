package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.Event
import org.example.database.withLogging

fun Route.eventRoutes() {
    val collection = "Events"

    route("/api/events") {
        get {
            val events = withLogging("GET all events") {
                val documents = FirebaseService.firestore.collection(collection).get().get()
                documents.map { doc ->
                    Event(
                        id = doc.id,
                        name = doc.getString("name"),
                        description = doc.getString("description"),
                        geopositionId = doc.getString("geopositionId"),
                        organizerId = doc.getString("organizerId"),
                        time = doc.getString("time")
                    )
                }
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
                    Event(
                        id = doc.id,
                        name = doc.getString("name"),
                        description = doc.getString("description"),
                        geopositionId = doc.getString("geopositionId"),
                        organizerId = doc.getString("organizerId"),
                        time = doc.getString("time")
                    )
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
            val data: Map<String, Any?> = mapOf(
                "name" to event.name,
                "description" to event.description,
                "geopositionId" to event.geopositionId,
                "organizerId" to event.organizerId,
                "time" to event.time
            )
            val docRef = withLogging("POST event") {
                FirebaseService.firestore.collection(collection).add(data).get()
            }
            call.respond(HttpStatusCode.Created, event.copy(id = docRef.id))
        }

        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val event = call.receive<Event>()
            val data: Map<String, Any?> = mapOf(
                "name" to event.name,
                "description" to event.description,
                "geopositionId" to event.geopositionId,
                "organizerId" to event.organizerId,
                "time" to event.time
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
