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
    val priceLevel: String? = null,
    val photos: List<PlacePhoto>? = null
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
    private const val SEARCH_RADIUS_M = 100_000.0

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


    suspend fun fetchAndStoreEvents(): FetchResult = withContext(Dispatchers.IO) {
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
                    storePlaceAsEvent(place)
                    stored++
                    logger.info("Stored event: {}", place.displayName?.text)
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


    /** Returns all Place IDs that are already present in the Events collection. */
    private fun loadStoredPlaceIds(): MutableSet<String> {
        return try {
            FirebaseService.firestore
                .collection("Events")
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
                        "places.priceLevel,places.photos"
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
     * Creates a Geoposition document and an Event document in Firestore for the given place.
     * Stores `placeId` on the event so future runs can skip it.
     */
    private fun storePlaceAsEvent(place: PlaceResult) {
        val firestore = FirebaseService.firestore

        // 1. Geoposition
        val geopositionId: String? = place.location
            ?.takeIf { it.latitude != null && it.longitude != null }
            ?.let { loc ->
                val geoRef = firestore.collection("Geopositions").document()
                geoRef.set(
                    mapOf("latitude" to loc.latitude!!, "longitude" to loc.longitude!!)
                ).get()
                geoRef.id
            }

        // 2. Photo URL
        val imageUri: String? = place.photos?.firstOrNull()?.name?.let { getPhotoUri(it) }

        // 3. Event document
        val eventRef = firestore.collection("Events").document()
        val eventData = HashMap<String, Any>()
        eventData["id"] = eventRef.id                        // mirrors existing POST handler
        eventData["name"] = place.displayName?.text ?: ""
        eventData["description"] = place.editorialSummary?.text
            ?: place.formattedAddress
            ?: ""
        eventData["category"] = mapCategory(place.types)
        eventData["placeId"] = place.id ?: ""
        eventData["isFromApi"] = true

        geopositionId?.let { eventData["geopositionId"] = it }
        imageUri?.let { eventData["imageUri"] = it }
        mapPrice(place.priceLevel)?.let { eventData["price"] = it }

        eventRef.set(eventData).get()
    }

    // Maps Google Places types to the Category values defined in the frontend:
    // types.ts: "food" | "sport" | "nature" | "culture" | "other"
    private fun mapCategory(types: List<String>?): String {
        if (types.isNullOrEmpty()) return "other"
        return when {
            types.any { it in setOf("restaurant", "cafe", "bakery", "bar", "meal_delivery", "meal_takeaway") } -> "food"
            types.any { it in setOf("stadium", "gym", "sports_complex", "golf_course", "bowling_alley") } -> "sport"
            types.any { it in setOf("park", "natural_feature", "campground", "beach", "hiking_area") } -> "nature"
            types.any { it in setOf("museum", "art_gallery", "library", "performing_arts_theater",
                "night_club", "movie_theater", "amusement_park", "casino", "tourist_attraction") } -> "culture"
            else -> "other"
        }
    }

    private fun mapPrice(priceLevel: String?): String? = when (priceLevel) {
        "PRICE_LEVEL_FREE" -> "Free"
        "PRICE_LEVEL_INEXPENSIVE" -> "€"
        "PRICE_LEVEL_MODERATE" -> "€€"
        "PRICE_LEVEL_EXPENSIVE" -> "€€€"
        "PRICE_LEVEL_VERY_EXPENSIVE" -> "€€€€"
        else -> null
    }
}
