package org.example.models

import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: String? = null,
    val name: String,
    val age: Int? = null,
    val gender: String = "",
    val email: String,
    val password: String,
    val isAdmin: Boolean = false
)

@Serializable
data class Event(
    val id: String = "",
    val name: String? = null,
    val description: String? = null,
    val geopositionId: String? = null,
    val organizerId: String? = null,
    val time: String? = null
)

@Serializable
data class Interest(
    val id: String = "",
    val interestName: String = ""
)

@Serializable
data class UserInterest(
    val id: String = "",
    val userId: String = "",
    val interestId: String = ""
)

@Serializable
data class Location(
    val id: String = "",
    val geopositionId: String? = null,
    val description: String? = null
)

@Serializable
data class Geoposition(
    val id: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0
)

@Serializable
data class FriendRelation(
    val id: String = "",
    val userId: String = "",
    val friendId: String = ""
)

@Serializable
data class FavouriteLocation(
    val id: String = "",
    val userId: String = "",
    val locationId: String = "",
    val favourite: Boolean = false
)

@Serializable
data class FavouriteEvent(
    val id: String = "",
    val userId: String = "",
    val eventId: String = "",
    val favourite: Boolean = false
)
