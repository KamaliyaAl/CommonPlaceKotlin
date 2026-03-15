package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.FriendRelation
import org.example.models.FavouriteEvent
import org.example.models.Profile
import org.example.database.withLogging

fun Route.friendRoutes() {
    val friendsCollection = "Friendship_relations"

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
            val friendProfiles = withLogging("GET friend profiles for $userId") {
                val friendsRelations = mutableListOf<FriendRelation>()
                
                // Find where the user is listed as userId
                val documents = FirebaseService.firestore.collection(friendsCollection)
                    .whereEqualTo("userId", userId).get().get()
                friendsRelations.addAll(documents.map { doc ->
                    FriendRelation(
                        id = doc.id,
                        userId = doc.getString("userId") ?: "",
                        friendId = doc.getString("friendId") ?: ""
                    )
                })
                
                // Find where the user is listed as friendId
                val documentsAsFriend = FirebaseService.firestore.collection(friendsCollection)
                    .whereEqualTo("friendId", userId).get().get()
                friendsRelations.addAll(documentsAsFriend.map { doc ->
                    FriendRelation(
                        id = doc.id,
                        userId = doc.getString("userId") ?: "",
                        friendId = doc.getString("friendId") ?: ""
                    )
                })
                
                // Extract distinct friend IDs
                val distinctFriendIds = friendsRelations.map { 
                    if (it.userId == userId) it.friendId else it.userId 
                }.distinct().filter { it != userId }
                
                // Fetch profile for each friend ID
                distinctFriendIds.mapNotNull { friendId ->
                    val doc = FirebaseService.firestore.collection("Profile").document(friendId).get().get()
                    if (doc.exists()) {
                        Profile(
                            id = doc.id,
                            name = doc.getString("name") ?: "",
                            age = doc.getLong("age")?.toInt(),
                            gender = doc.getBoolean("gender") ?: false,
                            email = doc.getString("email") ?: "",
                            password = doc.getString("password") ?: "",
                            isAdmin = doc.getBoolean("isAdmin") ?: false
                        )
                    } else {
                        null
                    }
                }
            }
            call.respond(friendProfiles)
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
                
                // Also check reverse relation just in case it was stored that way
                val reverseDocs = FirebaseService.firestore.collection(friendsCollection)
                    .whereEqualTo("userId", relation.friendId)
                    .whereEqualTo("friendId", relation.userId)
                    .get().get()
                reverseDocs.forEach { doc -> doc.reference.delete().get() }
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
