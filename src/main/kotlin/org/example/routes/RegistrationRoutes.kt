package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.EventRegistration
import org.example.database.withLogging
import java.time.Instant

fun Route.registrationRoutes() {
    val collection = "event_registrations"

    route("/api/registrations") {

        // POST /api/registrations — join event
        post {
            val reg = call.receive<EventRegistration>()
            if (reg.userId.isBlank() || reg.eventId.isBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest, "userId and eventId are required")
            }

            val existing = withLogging("CHECK registration ${reg.userId} / ${reg.eventId}") {
                FirebaseService.firestore.collection(collection)
                    .whereEqualTo("userId", reg.userId)
                    .whereEqualTo("eventId", reg.eventId)
                    .get().get()
            }
            if (!existing.isEmpty) {
                return@post call.respond(HttpStatusCode.Conflict, "Already registered")
            }

            val docRef = FirebaseService.firestore.collection(collection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "userId" to reg.userId,
                "eventId" to reg.eventId,
                "joinedAt" to Instant.now().toString()
            )
            withLogging("POST registration ${reg.userId} / ${reg.eventId}") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, reg.copy(id = docRef.id, joinedAt = data["joinedAt"] as String))
        }

        // DELETE /api/registrations — unjoin event
        delete {
            val reg = call.receive<EventRegistration>()
            withLogging("DELETE registration ${reg.userId} / ${reg.eventId}") {
                val docs = FirebaseService.firestore.collection(collection)
                    .whereEqualTo("userId", reg.userId)
                    .whereEqualTo("eventId", reg.eventId)
                    .get().get()
                docs.forEach { it.reference.delete().get() }
            }
            call.respond(HttpStatusCode.NoContent)
        }

        // GET /api/registrations/{userId} — all events user joined
        get("/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing userId")

            val registrations = withLogging("GET registrations for $userId") {
                FirebaseService.firestore.collection(collection)
                    .whereEqualTo("userId", userId)
                    .get().get()
                    .map { doc ->
                        EventRegistration(
                            id = doc.id,
                            userId = doc.getString("userId") ?: "",
                            eventId = doc.getString("eventId") ?: "",
                            joinedAt = doc.getString("joinedAt") ?: ""
                        )
                    }
            }
            call.respond(registrations)
        }

        // GET /api/registrations/event/{eventId} — all users registered for event
        get("/event/{eventId}") {
            val eventId = call.parameters["eventId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing eventId")

            val registrations = withLogging("GET registrations for event $eventId") {
                FirebaseService.firestore.collection(collection)
                    .whereEqualTo("eventId", eventId)
                    .get().get()
                    .map { doc ->
                        EventRegistration(
                            id = doc.id,
                            userId = doc.getString("userId") ?: "",
                            eventId = doc.getString("eventId") ?: "",
                            joinedAt = doc.getString("joinedAt") ?: ""
                        )
                    }
            }
            call.respond(registrations)
        }
    }
}
