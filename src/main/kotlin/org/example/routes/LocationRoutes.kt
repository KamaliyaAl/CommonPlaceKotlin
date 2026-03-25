package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.Location
import org.example.models.Geoposition
import org.example.database.withLogging

fun Route.locationRoutes() {
    val locationsCollection = "locations"
    val geopositionsCollection = "Geopositions"

    route("/api/locations") {
        get {
            val locations = withLogging("GET all locations") {
                val documents = FirebaseService.firestore.collection(locationsCollection).get().get()
                documents.map { doc ->
                    Location(
                        id = doc.id,
                        geopositionId = doc.getString("geopositionId"),
                        description = doc.getString("description")
                    )
                }
            }
            call.respond(locations)
        }

        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val location = withLogging("GET location $id") {
                val doc = FirebaseService.firestore.collection(locationsCollection).document(id).get().get()
                if (!doc.exists()) {
                    null
                } else {
                    Location(
                        id = doc.id,
                        geopositionId = doc.getString("geopositionId"),
                        description = doc.getString("description")
                    )
                }
            }
            if (location == null) {
                call.respond(HttpStatusCode.NotFound, "Location not found")
            } else {
                call.respond(location)
            }
        }

        post {
            val location = call.receive<Location>()
            val docRef = FirebaseService.firestore.collection(locationsCollection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "geopositionId" to location.geopositionId,
                "description" to location.description
            )
            withLogging("POST location") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, location.copy(id = docRef.id))
        }

        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val location = call.receive<Location>()
            val data: Map<String, Any?> = mapOf(
                "id" to id,
                "geopositionId" to location.geopositionId,
                "description" to location.description
            )
            withLogging("PUT location $id") {
                FirebaseService.firestore.collection(locationsCollection).document(id).set(data).get()
            }
            call.respond(HttpStatusCode.OK, location.copy(id = id))
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            withLogging("DELETE location $id") {
                FirebaseService.firestore.collection(locationsCollection).document(id).delete().get()
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }

    route("/api/geopositions") {
        get {
            val geopositions = withLogging("GET all geopositions") {
                val documents = FirebaseService.firestore.collection(geopositionsCollection).get().get()
                documents.map { doc ->
                    Geoposition(
                        id = doc.id,
                        latitude = doc.getDouble("latitude") ?: 0.0,
                        longitude = doc.getDouble("longitude") ?: 0.0
                    )
                }
            }
            call.respond(geopositions)
        }

        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            val geoposition = withLogging("GET geoposition $id") {
                val doc = FirebaseService.firestore.collection(geopositionsCollection).document(id).get().get()
                if (!doc.exists()) {
                    null
                } else {
                    Geoposition(
                        id = doc.id,
                        latitude = doc.getDouble("latitude") ?: 0.0,
                        longitude = doc.getDouble("longitude") ?: 0.0
                    )
                }
            }
            if (geoposition == null) {
                call.respond(HttpStatusCode.NotFound, "Geoposition not found")
            } else {
                call.respond(geoposition)
            }
        }

        post {
            val geoposition = call.receive<Geoposition>()
            val docRef = FirebaseService.firestore.collection(geopositionsCollection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "latitude" to geoposition.latitude,
                "longitude" to geoposition.longitude
            )
            withLogging("POST geoposition") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, geoposition.copy(id = docRef.id))
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(
                HttpStatusCode.BadRequest, "Missing id"
            )
            withLogging("DELETE geoposition $id") {
                FirebaseService.firestore.collection(geopositionsCollection).document(id).delete().get()
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
