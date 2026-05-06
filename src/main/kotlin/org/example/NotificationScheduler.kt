package org.example

import com.google.cloud.Timestamp
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
     * Event times are always Cyprus wall-clock. We strip any timezone marker
     * (`Z` or `±HH:MM`) before parsing so legacy entries that were saved with
     * `Z` (a frontend bug) still fire notifications at the wall-clock the
     * user originally typed.
     */
    private fun parseStartTime(raw: String): Instant? {
        val trimmed = raw.trim()
        // Drop trailing Z and any explicit numeric offset.
        val noTz = trimmed
            .removeSuffix("Z")
            .removeSuffix("z")
            .replace(Regex("[+-]\\d{2}:?\\d{2}$"), "")
        val cleaned = noTz.take(19) // "2026-04-17T18:00:00"
        return try {
            LocalDateTime.parse(cleaned)
                .atZone(ZoneId.of("Asia/Nicosia"))
                .toInstant()
        } catch (_: Exception) {
            null
        }
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

            val startTimeStr = when (val v = eventDoc.get("startTime")) {
                is Timestamp -> Instant.ofEpochSecond(v.seconds, v.nanos.toLong()).toString()
                is String -> v
                else -> null
            } ?: continue
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
                "\"$eventTitle\" starts in 24 hours!"
            else
                "\"$eventTitle\" starts in 1 hour!"

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
