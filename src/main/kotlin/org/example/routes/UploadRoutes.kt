package org.example.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

@Serializable
data class UploadImageRequest(val imageBase64: String)

@Serializable
data class UploadImageResponse(val url: String)

private val httpClient = HttpClient.newHttpClient()
private val json = Json { ignoreUnknownKeys = true }

fun Route.uploadRoutes() {
    post("/api/upload/image") {
        val req = call.receive<UploadImageRequest>()
        val base64 = req.imageBase64.replace("\n", "").replace("\r", "")
        val publicId = "profile_${System.currentTimeMillis()}"

        val body = buildString {
            append("""{"file":"data:image/jpeg;base64,""")
            append(base64)
            append("""","upload_preset":"commonplace","public_id":""")
            append(""""$publicId","filename_override":"profile"}""")
        }

        val httpRequest = HttpRequest.newBuilder()
            .uri(URI.create("https://api.cloudinary.com/v1_1/doxux3r14/image/upload"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()

        val response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString())
        val parsed = json.parseToJsonElement(response.body()).jsonObject

        val secureUrl = parsed["secure_url"]?.jsonPrimitive?.content
        val errorMsg = parsed["error"]?.jsonObject?.get("message")?.jsonPrimitive?.content

        if (secureUrl != null) {
            call.respond(UploadImageResponse(url = secureUrl))
        } else {
            call.respond(HttpStatusCode.InternalServerError, errorMsg ?: "Cloudinary upload failed")
        }
    }
}
