package org.example.routes

import com.google.cloud.firestore.QueryDocumentSnapshot
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.database.withLogging
import org.example.firebase.FirebaseService
import org.example.models.PlaceEntry

fun Route.placeEntryRoutes() {
    val collection = "place_entries"

    fun docToPlaceEntry(doc: QueryDocumentSnapshot): PlaceEntry = PlaceEntry(
        id = doc.id,
        name = doc.getString("name"),
        description = doc.getString("description"),
        category = doc.getString("category"),
        address = doc.getString("address"),
        phone = doc.getString("phone"),
        website = doc.getString("website"),
        openingHours = doc.getString("openingHours"),
        latitude = (doc.get("latitude") as? Number)?.toDouble() ?: 0.0,
        longitude = (doc.get("longitude") as? Number)?.toDouble() ?: 0.0,
        imageUri = doc.getString("imageUri"),
        organizerId = doc.getString("organizerId")
    )

    route("/api/place-entries") {
        get {
            val places = withLogging("GET place-entries") {
                FirebaseService.firestore.collection(collection).get().get()
                    .documents.map { docToPlaceEntry(it) }
            }
            call.respond(places)
        }

        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing id")
            val doc = withLogging("GET place-entry $id") {
                FirebaseService.firestore.collection(collection).document(id).get().get()
            }
            if (!doc.exists()) {
                call.respond(HttpStatusCode.NotFound, "Place not found")
            } else {
                call.respond(docToPlaceEntry(doc as QueryDocumentSnapshot))
            }
        }

        post {
            val place = call.receive<PlaceEntry>()
            val docRef = FirebaseService.firestore.collection(collection).document()
            val data: Map<String, Any?> = mapOf(
                "name" to place.name,
                "description" to place.description,
                "category" to place.category,
                "address" to place.address,
                "phone" to place.phone,
                "website" to place.website,
                "openingHours" to place.openingHours,
                "latitude" to place.latitude,
                "longitude" to place.longitude,
                "imageUri" to place.imageUri,
                "organizerId" to place.organizerId
            )
            withLogging("POST place-entry") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, place.copy(id = docRef.id))
        }

        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing id")
            val place = call.receive<PlaceEntry>()
            val data: Map<String, Any?> = mapOf(
                "name" to place.name,
                "description" to place.description,
                "category" to place.category,
                "address" to place.address,
                "phone" to place.phone,
                "website" to place.website,
                "openingHours" to place.openingHours,
                "latitude" to place.latitude,
                "longitude" to place.longitude,
                "imageUri" to place.imageUri,
                "organizerId" to place.organizerId
            )
            withLogging("PUT place-entry $id") {
                FirebaseService.firestore.collection(collection).document(id).set(data).get()
            }
            call.respond(HttpStatusCode.OK, place.copy(id = id))
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest, "Missing id")
            withLogging("DELETE place-entry $id") {
                FirebaseService.firestore.collection(collection).document(id).delete().get()
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
