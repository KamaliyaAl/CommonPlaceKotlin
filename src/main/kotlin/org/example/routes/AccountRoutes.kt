package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.Profile
import org.example.database.withLogging

fun Route.accountRoutes() {
    val collection = "Profile"

    route("/api/account") {
        post {
            val profile = call.receive<Profile>()
            val email = profile.email
            if (email.isBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest, "Email is required")
            }

            val existingProfile = withLogging("SIGNUP search for profile by email $email") {
                val documents = FirebaseService.firestore.collection(collection)
                    .whereEqualTo("email", email).get().get()
                if (documents.isEmpty) null else documents.documents[0]
            }

            if (existingProfile != null) {
                return@post call.respond(HttpStatusCode.Conflict, "Account already exists")
            }

            val data: Map<String, Any?> = mapOf(
                "name" to profile.name,
                "age" to profile.age,
                "gender" to profile.gender,
                "email" to profile.email,
                "password" to profile.password,
                "isAdmin" to false
            )

            val docRef = withLogging("POST create account") {
                FirebaseService.firestore.collection(collection).add(data).get()
            }
            call.respond(HttpStatusCode.Created, profile.copy(id = docRef.id, isAdmin = false))
        }

        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val profile = call.receive<Profile>()
            
            // Fetch existing to preserve isAdmin if not specified or just to check existence
            val docRef = FirebaseService.firestore.collection(collection).document(id)
            val doc = withLogging("GET account for update $id") { docRef.get().get() }
            
            if (!doc.exists()) {
                return@put call.respond(HttpStatusCode.NotFound, "Account not found")
            }

            val data: Map<String, Any?> = mapOf(
                "name" to profile.name,
                "age" to profile.age,
                "gender" to profile.gender,
                "email" to profile.email,
                "password" to profile.password,
                "isAdmin" to (doc.getBoolean("isAdmin") ?: false)
            )

            withLogging("PUT modify account $id") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.OK, profile.copy(id = id, isAdmin = (doc.getBoolean("isAdmin") ?: false)))
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            withLogging("DELETE account $id") {
                FirebaseService.firestore.collection(collection).document(id).delete().get()
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
