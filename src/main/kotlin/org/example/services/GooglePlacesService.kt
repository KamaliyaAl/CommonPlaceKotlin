package org.example.services

import io.github.cdimascio.dotenv.dotenv
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import org.example.firebase.FirebaseService
import org.slf4j.LoggerFactory
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration


@Serializable
private data class PlacesSearchResponse(
    val places: List<PlaceResult>? = null
)

@Serializable
private data class PlaceResult(
    val id: String? = null,
    val displayName: LocalizedText? = null,
    val editorialSummary: LocalizedText? = null,
    val formattedAddress: String? = null,
    val location: LatLngLiteral? = null,
    val types: List<String>? = null,
    val photos: List<PlacePhoto>? = null,
    val websiteUri: String? = null,
    val nationalPhoneNumber: String? = null,
    val internationalPhoneNumber: String? = null,
    val regularOpeningHours: OpeningHours? = null
)

@Serializable
private data class OpeningHours(
    val periods: List<OpeningPeriod>? = null
)

@Serializable
private data class OpeningPeriod(
    val open: TimePoint? = null,
    val close: TimePoint? = null
)

@Serializable
private data class TimePoint(
    val day: Int? = null,
    val hour: Int? = null,
    val minute: Int? = null
)

@Serializable
private data class LocalizedText(
    val text: String? = null
)

@Serializable
private data class LatLngLiteral(
    val latitude: Double? = null,
    val longitude: Double? = null
)

@Serializable
private data class PlacePhoto(
    val name: String? = null   // e.g. "places/ChI.../photos/AXCi..."
)

@Serializable
private data class PhotoMediaResponse(
    val photoUri: String? = null
)

@Serializable
data class FetchResult(
    val stored: Int,
    val skipped: Int,
    val errors: Int,
    val message: String
)

object GooglePlacesService {

    private val logger = LoggerFactory.getLogger(GooglePlacesService::class.java)

    private val dotenv = dotenv {
        filename = ".env.local"
        ignoreIfMissing = true
    }

    // Key must be set in .env.local as GOOGLE_PLACES_API_KEY
    private val apiKey: String
        get() = dotenv["GOOGLE_PLACES_API_KEY"] ?: System.getenv("GOOGLE_PLACES_API_KEY") ?: ""

    private val httpClient: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build()

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    // Cyprus geographic center used as location bias
    private const val CYPRUS_LAT = 35.1264
    private const val CYPRUS_LON = 33.4299
    private const val SEARCH_RADIUS_M = 50_000.0

    private val EVENT_QUERIES = listOf(
        "music concerts Cyprus",
        "live music Nicosia Cyprus",
        "cultural festivals Limassol",
        "art exhibitions Cyprus",
        "nightlife events Ayia Napa",
        "outdoor festivals Paphos Cyprus",
        "sports events Cyprus",
        "comedy shows Cyprus",
        "food and wine festivals Cyprus",
        "theater shows Nicosia"
    )


    suspend fun fetchAndStorePlaces(): FetchResult = withContext(Dispatchers.IO) {
        if (apiKey.isBlank()) {
            return@withContext FetchResult(
                stored = 0, skipped = 0, errors = 0,
                message = "GOOGLE_PLACES_API_KEY is not set in .env.local"
            )
        }

        // Pre-load already-imported Place IDs so we never create duplicates
        val knownPlaceIds = loadStoredPlaceIds()

        var stored = 0
        var skipped = 0
        var errors = 0

        for (query in EVENT_QUERIES) {
            val places = try {
                searchPlaces(query)
            } catch (e: Exception) {
                logger.error("Places text search failed for query '{}': {}", query, e.message)
                errors++
                continue
            }

            for (place in places) {
                val placeId = place.id ?: continue

                if (placeId in knownPlaceIds) {
                    skipped++
                    continue
                }
                knownPlaceIds.add(placeId)

                try {
                    storePlaceAsPlaceEntry(place)
                    stored++
                    logger.info("Stored place: {}", place.displayName?.text)
                } catch (e: Exception) {
                    logger.error("Failed to store '{}': {}", place.displayName?.text, e.message)
                    errors++
                }
            }
        }

        FetchResult(
            stored = stored,
            skipped = skipped,
            errors = errors,
            message = "Done — $stored stored, $skipped skipped (duplicates), $errors errors"
        )
    }


    /** Returns all Place IDs that are already present in the place_entries collection. */
    private fun loadStoredPlaceIds(): MutableSet<String> {
        return try {
            FirebaseService.firestore
                .collection("place_entries")
                .whereGreaterThan("placeId", "")   // matches non-empty string placeId fields only
                .get().get()
                .documents
                .mapNotNull { it.getString("placeId") }
                .toMutableSet()
        } catch (e: Exception) {
            logger.warn("Could not load existing place IDs ({}), proceeding without deduplication", e.message)
            mutableSetOf()
        }
    }

    /** Calls the Places API Text Search endpoint and returns parsed results. */
    private fun searchPlaces(query: String): List<PlaceResult> {
        val body = buildJsonObject {
            put("textQuery", query)
            put("languageCode", "en")
            put("regionCode", "CY")
            put("maxResultCount", 20)
            putJsonObject("locationBias") {
                putJsonObject("circle") {
                    putJsonObject("center") {
                        put("latitude", CYPRUS_LAT)
                        put("longitude", CYPRUS_LON)
                    }
                    put("radius", SEARCH_RADIUS_M)
                }
            }
        }.toString()

        val request = HttpRequest.newBuilder()
            .uri(URI.create("https://places.googleapis.com/v1/places:searchText"))
            .header("Content-Type", "application/json")
            .header("X-Goog-Api-Key", apiKey)
            .header(
                "X-Goog-FieldMask",
                "places.id,places.displayName,places.editorialSummary," +
                        "places.formattedAddress,places.location,places.types," +
                        "places.photos,places.websiteUri," +
                        "places.nationalPhoneNumber,places.internationalPhoneNumber," +
                        "places.regularOpeningHours"
            )
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()

        val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())

        if (response.statusCode() != 200) {
            throw RuntimeException("Places API HTTP ${response.statusCode()}: ${response.body()}")
        }

        return json.decodeFromString<PlacesSearchResponse>(response.body()).places ?: emptyList()
    }

    /**
     * Fetches a photo URI from the Places Photos Media API.
     * Returns null if the request fails so the event can still be stored without an image.
     */
    private fun getPhotoUri(photoResourceName: String): String? {
        return try {
            val url = "https://places.googleapis.com/v1/$photoResourceName/media" +
                    "?maxHeightPx=800&maxWidthPx=800&skipHttpRedirect=true"
            val request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("X-Goog-Api-Key", apiKey)
                .GET()
                .build()

            val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())
            if (response.statusCode() == 200) {
                json.decodeFromString<PhotoMediaResponse>(response.body()).photoUri
            } else {
                logger.warn("Photo fetch returned HTTP {}: {}", response.statusCode(), response.body().take(120))
                null
            }
        } catch (e: Exception) {
            logger.warn("Photo fetch failed for {}: {}", photoResourceName, e.message)
            null
        }
    }

    /**
     * Creates a PlaceEntry document in Firestore for the given Google place.
     * Stores `placeId` on the entry so future runs can skip it.
     */
    private fun storePlaceAsPlaceEntry(place: PlaceResult) {
        val firestore = FirebaseService.firestore

        val imageUri: String? = place.photos?.firstOrNull()?.name?.let { getPhotoUri(it) }

        val placeRef = firestore.collection("place_entries").document()
        val data = HashMap<String, Any>()
        data["name"] = place.displayName?.text ?: ""
        data["description"] = place.editorialSummary?.text ?: ""
        data["category"] = mapCategory(place.types)
        data["address"] = place.formattedAddress ?: ""
        data["latitude"] = place.location?.latitude ?: 0.0
        data["longitude"] = place.location?.longitude ?: 0.0
        data["placeId"] = place.id ?: ""
        data["isFromApi"] = true

        imageUri?.let { data["imageUri"] = it }
        place.websiteUri?.takeIf { it.isNotBlank() }?.let { data["website"] = it }
        (place.nationalPhoneNumber ?: place.internationalPhoneNumber)
            ?.takeIf { it.isNotBlank() }
            ?.let { data["phone"] = it }
        convertOpeningHours(place.regularOpeningHours)?.let { data["openingHours"] = it }

        placeRef.set(data).get()
    }

    // Maps Google Places types to PlaceCategory values used by the frontend
    // (mobile-frontend/src/types — restaurant/cafe/bar/gym/park/museum/gallery/hotel/shop/other).
    private fun mapCategory(types: List<String>?): String {
        if (types.isNullOrEmpty()) return "other"
        return when {
            types.any { it in setOf("restaurant", "meal_delivery", "meal_takeaway") } -> "restaurant"
            types.any { it in setOf("cafe", "bakery") } -> "cafe"
            types.any { it in setOf("bar", "night_club") } -> "bar"
            types.any { it in setOf("gym", "stadium", "sports_complex", "golf_course", "bowling_alley") } -> "gym"
            types.any { it in setOf("park", "natural_feature", "campground", "beach", "hiking_area") } -> "park"
            types.any { it in setOf("museum") } -> "museum"
            types.any { it in setOf("art_gallery") } -> "gallery"
            types.any { it in setOf("lodging", "hotel") } -> "hotel"
            types.any { it in setOf("store", "shopping_mall", "supermarket", "clothing_store") } -> "shop"
            else -> "other"
        }
    }

    /**
     * Converts Google's `regularOpeningHours.periods` into the JSON format expected
     * by the mobile frontend's `isOpenNow` helper:
     *   { "sun": { "open": "09:00", "close": "17:00" }, "mon": {...}, ... }
     * If multiple periods exist for the same day, the first one wins.
     */
    private fun convertOpeningHours(hours: OpeningHours?): String? {
        val periods = hours?.periods ?: return null
        val dayKeys = listOf("sun", "mon", "tue", "wed", "thu", "fri", "sat")
        val schedule = linkedMapOf<String, Pair<String, String>>()
        for (period in periods) {
            val open = period.open ?: continue
            val close = period.close ?: continue
            val dayIdx = open.day ?: continue
            if (dayIdx !in 0..6) continue
            val key = dayKeys[dayIdx]
            if (schedule.containsKey(key)) continue
            schedule[key] = "%02d:%02d".format(open.hour ?: 0, open.minute ?: 0) to
                    "%02d:%02d".format(close.hour ?: 0, close.minute ?: 0)
        }
        if (schedule.isEmpty()) return null
        val obj = buildJsonObject {
            schedule.forEach { (day, times) ->
                putJsonObject(day) {
                    put("open", times.first)
                    put("close", times.second)
                }
            }
        }
        return obj.toString()
    }

}
