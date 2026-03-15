package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.Interest
import org.example.models.UserInterest
import org.example.database.withLogging

fun Route.interestRoutes() {
    val interestsCollection = "Interests_stack"
    val userInterestsCollection = "Users_interest"

    route("/api/interests") {
        get {
            val interests = withLogging("GET all interests") {
                val documents = FirebaseService.firestore.collection(interestsCollection).get().get()
                documents.map { doc ->
                    Interest(
                        id = doc.id,
                        interestName = doc.getString("interestName") ?: ""
                    )
                }
            }
            call.respond(interests)
        }

        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val interest = withLogging("GET interestName $id") {
                val doc = FirebaseService.firestore.collection(interestsCollection).document(id).get().get()
                if (!doc.exists()) {
                    null
                } else {
                    Interest(
                        id = doc.id,
                        interestName = doc.getString("interestName") ?: ""
                    )
                }
            }
            if (interest == null) {
                call.respond(HttpStatusCode.NotFound, "Interest not found")
            } else {
                call.respond(interest)
            }
        }

        post {
            val interest = call.receive<Interest>()
            val docRef = FirebaseService.firestore.collection(interestsCollection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "interestName" to interest.interestName
            )
            withLogging("POST interestName") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, interest.copy(id = docRef.id))
        }

        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val interest = call.receive<Interest>()
            val data: Map<String, Any?> = mapOf(
                "id" to id,
                "interestName" to interest.interestName
            )
            withLogging("PUT interestName $id") {
                FirebaseService.firestore.collection(interestsCollection).document(id).set(data).get()
            }
            call.respond(HttpStatusCode.OK, interest.copy(id = id))
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            withLogging("DELETE interestName $id") {
                FirebaseService.firestore.collection(interestsCollection).document(id).delete().get()
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }

    route("/api/user-interests") {
        get {
            val userInterests = withLogging("GET all user interests") {
                val documents = FirebaseService.firestore.collection(userInterestsCollection).get().get()
                documents.map { doc ->
                    UserInterest(
                        id = doc.id,
                        userId = doc.getString("user_id") ?: "",
                        interestId = doc.getString("interest_id") ?: ""
                    )
                }
            }
            call.respond(userInterests)
        }

        get("/{userId}") {
            val userId = call.parameters["userId"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing userId"
            )
            val fullInterests = withLogging("GET full user interests for $userId") {
                val userInterestDocs = FirebaseService.firestore.collection(userInterestsCollection)
                    .whereEqualTo("user_id", userId).get().get()
                
                val interestIds = userInterestDocs.map { it.getString("interest_id") ?: "" }.filter { it.isNotEmpty() }
                
                interestIds.mapNotNull { interestId ->
                    val doc = FirebaseService.firestore.collection(interestsCollection).document(interestId).get().get()
                    if (doc.exists()) {
                        Interest(
                            id = doc.id,
                            interestName = doc.getString("interestName") ?: ""
                        )
                    } else null
                }
            }
            call.respond(fullInterests)
        }

        post {
            val userInterest = call.receive<UserInterest>()
            val docRef = FirebaseService.firestore.collection(userInterestsCollection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "user_id" to userInterest.userId,
                "interest_id" to userInterest.interestId
            )
            withLogging("POST user interestName") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, userInterest.copy(id = docRef.id))
        }

        delete {
            val userInterest = call.receive<UserInterest>()
            withLogging("DELETE user interestName") {
                val documents = FirebaseService.firestore.collection(userInterestsCollection)
                    .whereEqualTo("user_id", userInterest.userId)
                    .whereEqualTo("interest_id", userInterest.interestId)
                    .get().get()
                documents.forEach { doc -> doc.reference.delete().get() }
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
