package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.database.withLogging
import org.example.firebase.FirebaseService
import org.example.models.PlaceReview
import java.time.Instant

fun Route.placeReviewRoutes() {
    val collection = "PlaceReviews"

    fun docToReview(doc: com.google.cloud.firestore.QueryDocumentSnapshot): PlaceReview = PlaceReview(
        id = doc.id,
        placeId = doc.getString("placeId") ?: "",
        userId = doc.getString("userId") ?: "",
        userName = doc.getString("userName") ?: "",
        rating = doc.getDouble("rating") ?: 0.0,
        reviewText = doc.getString("reviewText") ?: "",
        adviceText = doc.getString("adviceText"),
        imageUri = doc.getString("imageUri"),
        timestamp = doc.getString("timestamp")
    )

    route("/api/place-reviews") {

        // GET /api/place-reviews/{placeId}?sortBy=rating|date
        get("/{placeId}") {
            val placeId = call.parameters["placeId"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing placeId"
            )
            val sortBy = call.request.queryParameters["sortBy"] ?: "date"

            val reviews = withLogging("GET reviews for place $placeId") {
                val docs = FirebaseService.firestore
                    .collection(collection)
                    .whereEqualTo("placeId", placeId)
                    .get().get()
                    .map { docToReview(it) }

                when (sortBy) {
                    "rating" -> docs.sortedByDescending { it.rating }
                    else -> docs.sortedByDescending { it.timestamp ?: "" }
                }
            }
            call.respond(reviews)
        }

        // PUT /api/place-reviews/{reviewId}
        put("/{reviewId}") {
            val reviewId = call.parameters["reviewId"] ?: return@put call.respond(
                HttpStatusCode.BadRequest, "Missing reviewId"
            )
            val review = call.receive<PlaceReview>()
            val timestamp = Instant.now().toString()

            val data = mapOf(
                "rating" to review.rating,
                "reviewText" to review.reviewText,
                "adviceText" to (review.adviceText ?: ""),
                "imageUri" to (review.imageUri ?: ""),
                "timestamp" to timestamp
            )
            withLogging("PUT review $reviewId for place ${review.placeId}") {
                FirebaseService.firestore.collection(collection).document(reviewId).update(data).get()
            }
            call.respond(review.copy(id = reviewId, timestamp = timestamp))
        }

        // POST /api/place-reviews
        post {
            val review = call.receive<PlaceReview>()
            val docRef = FirebaseService.firestore.collection(collection).document()
            val timestamp = Instant.now().toString()

            val data = mapOf(
                "id" to docRef.id,
                "placeId" to review.placeId,
                "userId" to review.userId,
                "userName" to review.userName,
                "rating" to review.rating,
                "reviewText" to review.reviewText,
                "adviceText" to (review.adviceText ?: ""),
                "imageUri" to (review.imageUri ?: ""),
                "timestamp" to timestamp
            )
            withLogging("POST review for place ${review.placeId}") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, review.copy(id = docRef.id, timestamp = timestamp))
        }
    }
}
