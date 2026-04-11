package org.example

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.defaultheaders.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.http.content.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json
import org.example.firebase.FirebaseService
import org.example.routes.*
import java.io.File

fun main() {
    FirebaseService.initialize()

    embeddedServer(Netty, port = 8080, host = "0.0.0.0") {
        configurePlugins()
        configureRouting()
    }.start(wait = true)
}

fun Application.configurePlugins() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }

    install(CORS) {
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Options)
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        anyHost()
    }

    install(DefaultHeaders) {
        header("X-Engine", "Ktor")
    }

    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respondText(
                text = "500: ${cause.localizedMessage}",
                status = HttpStatusCode.InternalServerError
            )
        }
    }
}

fun Application.configureRouting() {
    routing {
        // API routes
        get("/api/health") {
            call.respondText("OK")
        }

        profileRoutes()
        accountRoutes()
        eventRoutes()
        interestRoutes()
        locationRoutes()
        friendRoutes()
        favouriteRoutes()
        placesRoutes()
        placeEntryRoutes()

        // Serve static files from the frontend/dist directory if it exists
        val distDir = File("frontend/dist")
        if (distDir.exists() && distDir.isDirectory) {
            // Explicitly serve the assets directory first
            staticFiles("/assets", File(distDir, "assets"))
            
            // Serve other root-level static files
            staticFiles("/", distDir)

            // MPA fallback: try to serve the path as an HTML file, or fallback to index.html for navigation
            get("{...}") {
                val path = call.request.path().removePrefix("/")
                
                // If it's an API call, let it through (should have been handled by api routes anyway)
                if (path.startsWith("api/")) return@get

                // If it looks like a static asset request (has a dot and it's not .html), 
                // do NOT fallback to index.html to avoid MIME type errors.
                if (path.contains(".") && !path.endsWith(".html")) {
                    return@get
                }

                val fileName = if (path.isEmpty()) "index.html" else "$path.html"
                val file = File(distDir, fileName)
                
                // Special check for paths that might be handled as files but should fallback to their .html version
                val altFile = if (path.isNotEmpty() && !path.contains(".")) File(distDir, "$path.html") else null

                if (file.exists() && file.isFile) {
                    call.respondFile(file)
                } else if (altFile != null && altFile.exists() && altFile.isFile) {
                    call.respondFile(altFile)
                } else if (!path.contains(".")) {
                    // Fallback to index.html only for clean navigation paths (no dots)
                    val indexFile = File(distDir, "index.html")
                    if (indexFile.exists()) {
                        call.respondFile(indexFile)
                    }
                }
            }
        } else {
            get("/") {
                call.respondText("Kamaliia API is running! (Note: Frontend build not found in frontend/dist. Run 'npm run build' in frontend directory to serve UI.)")
            }
        }
    }
}
