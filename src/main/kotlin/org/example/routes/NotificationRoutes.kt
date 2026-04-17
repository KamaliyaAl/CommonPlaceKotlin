package org.example.routes

import io.ktor.http.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.Notification
import org.example.database.withLogging

fun Route.notificationRoutes() {
    val collection = "Notifications"

    route("/api/notifications") {

        // GET /api/notifications/{userId} — all notifications for user, newest first
        get("/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing userId")

            val notifications = withLogging("GET notifications for $userId") {
                FirebaseService.firestore.collection(collection)
                    .whereEqualTo("userId", userId)
                    .get().get()
                    .map { doc ->
                        Notification(
                            id = doc.id,
                            userId = doc.getString("userId") ?: "",
                            eventId = doc.getString("eventId") ?: "",
                            eventTitle = doc.getString("eventTitle") ?: "",
                            text = doc.getString("text") ?: "",
                            sentAt = doc.getString("sentAt") ?: "",
                            read = doc.getBoolean("read") ?: false,
                            type = doc.getString("type") ?: ""
                        )
                    }
                    .sortedByDescending { it.sentAt }
            }
            call.respond(notifications)
        }

        // PUT /api/notifications/{id}/read — mark one as read
        put("/{id}/read") {
            val id = call.parameters["id"]
                ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing id")

            withLogging("MARK notification $id as read") {
                FirebaseService.firestore.collection(collection)
                    .document(id)
                    .update("read", true)
                    .get()
            }
            call.respond(HttpStatusCode.OK, mapOf("status" to "ok"))
        }

        // PUT /api/notifications/read-all/{userId} — mark all as read
        put("/read-all/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing userId")

            withLogging("MARK all notifications read for $userId") {
                val docs = FirebaseService.firestore.collection(collection)
                    .whereEqualTo("userId", userId)
                    .whereEqualTo("read", false)
                    .get().get()
                docs.forEach { it.reference.update("read", true).get() }
            }
            call.respond(HttpStatusCode.OK, mapOf("status" to "ok"))
        }
    }
}
