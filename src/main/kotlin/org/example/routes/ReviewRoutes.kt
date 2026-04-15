package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.database.withLogging
import org.example.firebase.FirebaseService
import org.example.models.Review
import java.time.Instant

fun Route.reviewRoutes() {
    val collection = "Reviews"

    fun docToReview(doc: com.google.cloud.firestore.QueryDocumentSnapshot): Review = Review(
        id = doc.id,
        eventId = doc.getString("eventId") ?: "",
        userId = doc.getString("userId") ?: "",
        userName = doc.getString("userName") ?: "",
        rating = doc.getDouble("rating") ?: 0.0,
        reviewText = doc.getString("reviewText") ?: "",
        adviceText = doc.getString("adviceText"),
        timestamp = doc.getString("timestamp")
    )

    route("/api/reviews") {

        // GET /api/reviews/{eventId}?sortBy=rating|date
        get("/{eventId}") {
            val eventId = call.parameters["eventId"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing eventId"
            )
            val sortBy = call.request.queryParameters["sortBy"] ?: "date"

            val reviews = withLogging("GET reviews for event $eventId") {
                val docs = FirebaseService.firestore
                    .collection(collection)
                    .whereEqualTo("eventId", eventId)
                    .get().get()
                    .map { docToReview(it) }

                when (sortBy) {
                    "rating" -> docs.sortedByDescending { it.rating }
                    else -> docs.sortedByDescending { it.timestamp ?: "" }
                }
            }
            call.respond(reviews)
        }

        // POST /api/reviews
        post {
            val review = call.receive<Review>()
            val docRef = FirebaseService.firestore.collection(collection).document()
            val timestamp = Instant.now().toString()

            val data = mapOf(
                "id" to docRef.id,
                "eventId" to review.eventId,
                "userId" to review.userId,
                "userName" to review.userName,
                "rating" to review.rating,
                "reviewText" to review.reviewText,
                "adviceText" to (review.adviceText ?: ""),
                "timestamp" to timestamp
            )
            withLogging("POST review for event ${review.eventId}") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, review.copy(id = docRef.id, timestamp = timestamp))
        }
    }
}
