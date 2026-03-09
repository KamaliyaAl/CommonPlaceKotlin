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
    val userInterestsCollection = "user_interests"

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
            val interest = withLogging("GET interest $id") {
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
            val data: Map<String, Any?> = mapOf("interestName" to interest.interestName)
            val docRef = withLogging("POST interest") {
                FirebaseService.firestore.collection(interestsCollection).add(data).get()
            }
            call.respond(HttpStatusCode.Created, interest.copy(id = docRef.id))
        }

        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val interest = call.receive<Interest>()
            val data: Map<String, Any?> = mapOf("interestName" to interest.interestName)
            withLogging("PUT interest $id") {
                FirebaseService.firestore.collection(interestsCollection).document(id).set(data).get()
            }
            call.respond(HttpStatusCode.OK, interest.copy(id = id))
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            withLogging("DELETE interest $id") {
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
                        userId = doc.getString("userId") ?: "",
                        interestId = doc.getString("interestId") ?: ""
                    )
                }
            }
            call.respond(userInterests)
        }

        get("/{userId}") {
            val userId = call.parameters["userId"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing userId"
            )
            val userInterests = withLogging("GET user interests for $userId") {
                val documents = FirebaseService.firestore.collection(userInterestsCollection)
                    .whereEqualTo("userId", userId).get().get()
                documents.map { doc ->
                    UserInterest(
                        userId = doc.getString("userId") ?: "",
                        interestId = doc.getString("interestId") ?: ""
                    )
                }
            }
            call.respond(userInterests)
        }

        post {
            val userInterest = call.receive<UserInterest>()
            val data: Map<String, Any?> = mapOf(
                "userId" to userInterest.userId,
                "interestId" to userInterest.interestId
            )
            withLogging("POST user interest") {
                FirebaseService.firestore.collection(userInterestsCollection).add(data).get()
            }
            call.respond(HttpStatusCode.Created, userInterest)
        }

        delete {
            val userInterest = call.receive<UserInterest>()
            withLogging("DELETE user interest") {
                val documents = FirebaseService.firestore.collection(userInterestsCollection)
                    .whereEqualTo("userId", userInterest.userId)
                    .whereEqualTo("interestId", userInterest.interestId)
                    .get().get()
                documents.forEach { doc -> doc.reference.delete().get() }
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
