package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.Profile
import org.example.models.LoginRequest
import org.example.database.withLogging

fun Route.profileRoutes() {
    val collection = "Profile"

    route("/api/profiles") {
        post("/login") {
            val loginRequest = call.receive<LoginRequest>()
            val email = loginRequest.email
            val password = loginRequest.password

            if (email.isBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest, "Email is required")
            }

            val existingProfile = withLogging("LOGIN search for profile by email $email") {
                val documents = FirebaseService.firestore.collection(collection)
                    .whereEqualTo("email", email).get().get()
                if (documents.isEmpty) null else documents.documents[0]
            }

            if (existingProfile != null) {
                val existingPassword = existingProfile.getString("password") ?: ""
                if (existingPassword == password) {
                    val profile = Profile(
                        id = existingProfile.id,
                        name = existingProfile.getString("name") ?: "",
                        age = existingProfile.getLong("age")?.toInt(),
                        gender = existingProfile.getBoolean("gender") ?: false,
                        email = existingProfile.getString("email") ?: "",
                        password = existingPassword,
                        isAdmin = existingProfile.getBoolean("isAdmin") ?: false,
                        photoURL = existingProfile.getString("photoURL")
                    )
                    call.respond(HttpStatusCode.OK, profile)
                } else {
                    call.respond(HttpStatusCode.Unauthorized, "Invalid password")
                }

            } else {
                call.respond(HttpStatusCode.NotFound, "Create a new account before logging in")
            }
        }

        get {
            val profiles = withLogging("GET all profiles") {
                val documents = FirebaseService.firestore.collection(collection).get().get()
                documents.map { doc ->
                    Profile(
                        id = doc.id,
                        name = doc.getString("name") ?: "",
                        age = doc.getLong("age")?.toInt(),
                        gender = doc.getBoolean("gender") ?: false,
                        email = doc.getString("email") ?: "",
                        password = doc.getString("password") ?: "",
                        isAdmin = doc.getBoolean("isAdmin") ?: false,
                        photoURL = doc.getString("photoURL")
                    )
                }
            }
            call.respond(profiles)
        }

        get("/by-email") {
            val email = call.request.queryParameters["email"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing email")

            val profile = withLogging("GET profile by email $email") {
                val documents = FirebaseService.firestore.collection(collection)
                    .whereEqualTo("email", email).get().get()
                if (documents.isEmpty) {
                    null
                } else {
                    val doc = documents.documents[0]
                    Profile(
                        id = doc.id,
                        name = doc.getString("name") ?: "",
                        age = doc.getLong("age")?.toInt(),
                        gender = doc.getBoolean("gender") ?: false,
                        email = doc.getString("email") ?: "",
                        password = doc.getString("password") ?: "",
                        isAdmin = doc.getBoolean("isAdmin") ?: false,
                        photoURL = doc.getString("photoURL")
                    )
                }
            }
            if (profile == null) {
                call.respond(HttpStatusCode.NotFound, "Profile not found")
            } else {
                call.respond(profile)
            }
        }

        get("/{id}") {
            val id = call.parameters["id"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing id")

            val profile = withLogging("GET profile $id") {
                val doc = FirebaseService.firestore.collection(collection)
                    .document(id).get().get()

                if (!doc.exists()) {
                    null
                } else {
                    Profile(
                        id = doc.id,
                        name = doc.getString("name") ?: "",
                        age = doc.getLong("age")?.toInt(),
                        gender = doc.getBoolean("gender") ?: false,
                        email = doc.getString("email") ?: "",
                        password = doc.getString("password") ?: "",
                        isAdmin = doc.getBoolean("isAdmin") ?: false,
                        photoURL = doc.getString("photoURL")
                    )
                }
            }
            if (profile == null) {
                call.respond(HttpStatusCode.NotFound, "Profile not found")
            } else {
                call.respond(profile)
            }
        }

        post {
            val profile = call.receive<Profile>()
            val docRef = FirebaseService.firestore.collection(collection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "name" to profile.name,
                "age" to profile.age,
                "gender" to profile.gender,
                "email" to profile.email,
                "password" to profile.password,
                "isAdmin" to profile.isAdmin,
                "photoURL" to profile.photoURL
            )
            withLogging("POST profile") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, profile.copy(id = docRef.id))
        }

        put("/{id}") {
            val id = call.parameters["id"]
                ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing id")

            val profile = call.receive<Profile>()

            val existingProfileDoc = withLogging("GET profile for update $id") {
                FirebaseService.firestore.collection(collection)
                    .document(id).get().get()
            }

            val finalPassword = if (profile.password.isBlank() && existingProfileDoc.exists()) {
                existingProfileDoc.getString("password") ?: ""
            } else {
                profile.password
            }
            
            val existingPhotoURL = existingProfileDoc.getString("photoURL")
            val finalPhotoURL = if (!profile.photoURL.isNullOrBlank()) profile.photoURL else existingPhotoURL

            val data: Map<String, Any?> = mapOf(
                "id" to id,
                "name" to profile.name,
                "age" to profile.age,
                "gender" to profile.gender,
                "email" to profile.email,
                "password" to finalPassword,
                "isAdmin" to profile.isAdmin,
                "photoURL" to finalPhotoURL
            )
            withLogging("PUT profile $id") {
                FirebaseService.firestore.collection(collection)
                    .document(id).set(data).get()
            }
            call.respond(HttpStatusCode.OK, profile.copy(id = id, photoURL = finalPhotoURL))
        }

        delete("/{id}") {
            val id = call.parameters["id"]
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Missing id")

            withLogging("DELETE profile $id") {
                FirebaseService.firestore.collection(collection)
                    .document(id).delete().get()
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
