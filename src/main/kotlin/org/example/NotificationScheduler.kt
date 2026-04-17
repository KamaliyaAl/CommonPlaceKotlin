package org.example

import kotlinx.coroutines.*
import org.example.firebase.FirebaseService
import org.slf4j.LoggerFactory
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit

object NotificationScheduler {
    private val logger = LoggerFactory.getLogger(NotificationScheduler::class.java)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun start() {
        scope.launch {
            logger.info("NotificationScheduler started")
            while (isActive) {
                try {
                    checkAndSendNotifications()
                } catch (e: Exception) {
                    logger.error("NotificationScheduler error: ${e.message}", e)
                }
                delay(10 * 60 * 1_000L) // run every 10 minutes
            }
        }
    }

    /**
     * Parses a startTime string that may or may not include timezone info.
     * Stored values look like "2026-04-17T18:00:00" (Cyprus local, no Z) or
     * "2026-04-17T18:00:00Z" (UTC).  We treat no-timezone strings as Cyprus
     * local time (Europe/Nicosia) so the 1h/24h windows fire at the right moment.
     */
    private fun parseStartTime(raw: String): Instant? {
        val cleaned = raw.trim().take(19) // "2026-04-17T18:00:00"

        // 1. String already has timezone info — parse as-is
        if (raw.length > 19) {
            try { return Instant.parse(raw.trim()) } catch (_: Exception) {}
        }

        // 2. No timezone — treat as Cyprus local time (how users enter it in the app)
        try {
            return LocalDateTime.parse(cleaned)
                .atZone(ZoneId.of("Asia/Nicosia"))
                .toInstant()
        } catch (_: Exception) {}

        return null
    }

    private fun checkAndSendNotifications() {
        val now = Instant.now()
        val registrationCollection = "event_registrations"
        val eventsCollection = "Events"
        val notifCollection = "Notifications"

        logger.info("Checking notifications at $now")

        val allRegistrations = FirebaseService.firestore
            .collection(registrationCollection).get().get()

        // Group registrations by eventId
        val byEvent = allRegistrations.groupBy { it.getString("eventId") ?: "" }
            .filter { it.key.isNotEmpty() }

        for ((eventId, regDocs) in byEvent) {
            val eventDoc = FirebaseService.firestore
                .collection(eventsCollection).document(eventId).get().get()
            if (!eventDoc.exists()) continue

            val startTimeStr = eventDoc.getString("startTime") ?: continue
            val eventTitle = eventDoc.getString("name") ?: "Event"

            val startTime = parseStartTime(startTimeStr) ?: run {
                logger.warn("Cannot parse startTime '$startTimeStr' for event $eventId")
                continue
            }

            // Minutes until event starts
            val minutesUntil = ChronoUnit.MINUTES.between(now, startTime)
            logger.info("Event '$eventTitle' ($eventId): startTime=$startTime, minutesUntil=$minutesUntil")

            // 24h window: 23h30m – 24h30m  →  [1410, 1470] minutes
            val is24h = minutesUntil in 1410..1470
            // 1h window:  0h30m –  1h30m  →  [30, 90] minutes
            val is1h = minutesUntil in 30..90

            if (!is24h && !is1h) continue

            val notifType = if (is24h) "24h" else "1h"
            val notifText = if (is24h)
                "До мероприятия «$eventTitle» осталось 24 часа!"
            else
                "До мероприятия «$eventTitle» остался 1 час!"

            for (regDoc in regDocs) {
                val userId = regDoc.getString("userId") ?: continue

                // Skip if already sent this type for this user+event
                val existing = FirebaseService.firestore.collection(notifCollection)
                    .whereEqualTo("userId", userId)
                    .whereEqualTo("eventId", eventId)
                    .whereEqualTo("type", notifType)
                    .get().get()
                if (!existing.isEmpty) continue

                val docRef = FirebaseService.firestore.collection(notifCollection).document()
                val data: Map<String, Any> = mapOf(
                    "id" to docRef.id,
                    "userId" to userId,
                    "eventId" to eventId,
                    "eventTitle" to eventTitle,
                    "text" to notifText,
                    "sentAt" to now.toString(),
                    "read" to false,
                    "type" to notifType
                )
                docRef.set(data).get()
                logger.info("Sent $notifType notification to $userId for event $eventId")
            }
        }
    }
}
