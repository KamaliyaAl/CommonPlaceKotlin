package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.example.firebase.FirebaseService
import org.example.models.FriendRelation
import org.example.models.FriendRequest
import org.example.models.FavouriteEvent
import org.example.models.Profile
import org.example.database.withLogging

fun Route.friendRoutes() {
    val friendsCollection = "Friendship_relations"
    val requestsCollection = "Friendship_requests"

    route("/api/friend-requests") {
        get("/received/{userId}") {
            val userId = call.parameters["userId"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing userId")
            val requests = withLogging("GET received friend requests for $userId") {
                val documents = FirebaseService.firestore.collection(requestsCollection)
                    .whereEqualTo("toUserId", userId)
                    .whereEqualTo("status", "PENDING")
                    .get().get()
                documents.map { doc ->
                    val fromUserId = doc.getString("fromUserId") ?: ""
                    // Also get profile of the sender to show name
                    val senderProfile = FirebaseService.firestore.collection("Profile").document(fromUserId).get().get()
                    val senderName = senderProfile.getString("name") ?: "Unknown"

                    mapOf(
                        "id" to doc.id,
                        "fromUserId" to fromUserId,
                        "fromUserName" to senderName,
                        "toUserId" to (doc.getString("toUserId") ?: ""),
                        "status" to (doc.getString("status") ?: "PENDING")
                    )
                }
            }
            call.respond(requests)
        }

        post {
            val request = call.receive<FriendRequest>()
            // Check if already friends
            val alreadyFriends = withLogging("Check if already friends before request") {
                val doc = FirebaseService.firestore.collection(friendsCollection)
                    .whereEqualTo("userId", request.fromUserId)
                    .whereEqualTo("friendId", request.toUserId)
                    .get().get()
                !doc.isEmpty
            }
            if (alreadyFriends) {
                return@post call.respond(HttpStatusCode.Conflict, "Already friends")
            }

            // Check if request already exists
            val existingRequest = withLogging("Check if request already exists") {
                val doc = FirebaseService.firestore.collection(requestsCollection)
                    .whereEqualTo("fromUserId", request.fromUserId)
                    .whereEqualTo("toUserId", request.toUserId)
                    .whereEqualTo("status", "PENDING")
                    .get().get()
                !doc.isEmpty
            }
            if (existingRequest) {
                return@post call.respond(HttpStatusCode.Conflict, "Request already sent")
            }

            val docRef = FirebaseService.firestore.collection(requestsCollection).document()
            val data: Map<String, Any?> = mapOf(
                "id" to docRef.id,
                "fromUserId" to request.fromUserId,
                "toUserId" to request.toUserId,
                "status" to "PENDING"
            )
            withLogging("POST friend request") {
                docRef.set(data).get()
            }
            call.respond(HttpStatusCode.Created, request.copy(id = docRef.id))
        }

        post("/{id}/accept") {
            val id = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest, "Missing id")
            val result = withLogging("ACCEPT friend request $id") {
                val docRef = FirebaseService.firestore.collection(requestsCollection).document(id)
                val doc = docRef.get().get()
                if (doc.exists()) {
                    val fromUserId = doc.getString("fromUserId") ?: ""
                    val toUserId = doc.getString("toUserId") ?: ""
                    
                    // Create friendship records (both ways)
                    val f1 = FirebaseService.firestore.collection(friendsCollection).document()
                    f1.set(mapOf("id" to f1.id, "userId" to fromUserId, "friendId" to toUserId)).get()
                    
                    val f2 = FirebaseService.firestore.collection(friendsCollection).document()
                    f2.set(mapOf("id" to f2.id, "userId" to toUserId, "friendId" to fromUserId)).get()
                    
                    // Delete the request
                    docRef.delete().get()
                    true
                } else {
                    false
                }
            }
            if (result) {
                call.respond(HttpStatusCode.OK, mapOf("status" to "Accepted"))
            } else {
                call.respond(HttpStatusCode.NotFound, mapOf("error" to "Request not found"))
            }
        }

        post("/{id}/decline") {
            val id = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest, "Missing id")
            withLogging("DECLINE friend request $id") {
                FirebaseService.firestore.collection(requestsCollection).document(id).delete().get()
            }
            call.respond(HttpStatusCode.OK, mapOf("status" to "Declined"))
        }

        get("/outgoing/{userId}") {
            val userId = call.parameters["userId"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing userId")
            val requests = withLogging("GET outgoing friend requests for $userId") {
                val documents = FirebaseService.firestore.collection(requestsCollection)
                    .whereEqualTo("fromUserId", userId)
                    .whereEqualTo("status", "PENDING")
                    .get().get()
                documents.map { doc ->
                    mapOf(
                        "id" to doc.id,
                        "fromUserId" to (doc.getString("fromUserId") ?: ""),
                        "toUserId" to (doc.getString("toUserId") ?: ""),
                        "status" to (doc.getString("status") ?: "PENDING")
                    )
                }
            }
            call.respond(requests)
        }
    }

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
            val docRef1 = FirebaseService.firestore.collection(friendsCollection).document()
            val data1: Map<String, Any?> = mapOf(
                "id" to docRef1.id,
                "userId" to relation.userId,
                "friendId" to relation.friendId
            )
            val docRef2 = FirebaseService.firestore.collection(friendsCollection).document()
            val data2: Map<String, Any?> = mapOf(
                "id" to docRef2.id,
                "userId" to relation.friendId,
                "friendId" to relation.userId
            )
            withLogging("POST friend relation (both directions)") {
                docRef1.set(data1).get()
                docRef2.set(data2).get()
            }
            call.respond(HttpStatusCode.Created, relation)
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


