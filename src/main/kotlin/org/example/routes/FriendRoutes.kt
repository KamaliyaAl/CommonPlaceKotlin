package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.FriendRelation
import org.example.models.FavouriteEvent
import org.example.database.withLogging

fun Route.friendRoutes() {
    val friendsCollection = "friends_relations"

    route("/api/friends") {
        get {
            val friends = withLogging("GET all friends") {
                val documents = FirebaseService.firestore.collection(friendsCollection).get().get()
                documents.map { doc ->
                    FriendRelation(
                        id = doc.id,
                        userId = doc.getString("userId") ?: "",
                        friendId = doc.getString("friendId") ?: ""
                    )
                }
            }
            call.respond(friends)
        }

        get("/{userId}") {
            val userId = call.parameters["userId"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing userId"
            )
            val friends = withLogging("GET friends for $userId") {
                val documents = FirebaseService.firestore.collection(friendsCollection)
                    .whereEqualTo("userId", userId).get().get()
                documents.map { doc ->
                    FriendRelation(
                        id = doc.id,
                        userId = doc.getString("userId") ?: "",
                        friendId = doc.getString("friendId") ?: ""
                    )
                }
            }
            call.respond(friends)
        }

        post {
            val relation = call.receive<FriendRelation>()
            val docRef = FirebaseService.firestore.collection(friendsCollection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "userId" to relation.userId,
                "friendId" to relation.friendId
            )
            withLogging("POST friend relation") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, relation.copy(id = docRef.id))
        }

        delete {
            val relation = call.receive<FriendRelation>()
            withLogging("DELETE friend relation") {
                val documents = FirebaseService.firestore.collection(friendsCollection)
                    .whereEqualTo("userId", relation.userId)
                    .whereEqualTo("friendId", relation.friendId)
                    .get().get()
                documents.forEach { doc -> doc.reference.delete().get() }
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

fun Route.favouriteEventRoutes() {
    val favouriteEventsCollection = "favourite_events"

    route("/api/favourite-events") {
        get {
            val favourites = withLogging("GET all favourite events") {
                val documents = FirebaseService.firestore.collection(favouriteEventsCollection).get().get()
                documents.map { doc ->
                    FavouriteEvent(
                        id = doc.id,
                        userId = doc.getString("userId") ?: "",
                        eventId = doc.getString("eventId") ?: "",
                        favourite = doc.getBoolean("favourite") ?: false
                    )
                }
            }
            call.respond(favourites)
        }

        get("/{userId}") {
            val userId = call.parameters["userId"] ?: return@get call.respond(
                HttpStatusCode.BadRequest, "Missing userId"
            )
            val favourites = withLogging("GET favourite events for $userId") {
                val documents = FirebaseService.firestore.collection(favouriteEventsCollection)
                    .whereEqualTo("userId", userId).get().get()
                documents.map { doc ->
                    FavouriteEvent(
                        id = doc.id,
                        userId = doc.getString("userId") ?: "",
                        eventId = doc.getString("eventId") ?: "",
                        favourite = doc.getBoolean("favourite") ?: false
                    )
                }
            }
            call.respond(favourites)
        }

        post {
            val fav = call.receive<FavouriteEvent>()
            val docRef = FirebaseService.firestore.collection(favouriteEventsCollection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "userId" to fav.userId,
                "eventId" to fav.eventId,
                "favourite" to fav.favourite
            )
            withLogging("POST favourite event") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, fav.copy(id = docRef.id))
        }

        delete {
            val fav = call.receive<FavouriteEvent>()
            withLogging("DELETE favourite event") {
                val documents = FirebaseService.firestore.collection(favouriteEventsCollection)
                    .whereEqualTo("userId", fav.userId)
                    .whereEqualTo("eventId", fav.eventId)
                    .get().get()
                documents.forEach { doc -> doc.reference.delete().get() }
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
