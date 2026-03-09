package org.example.database

import org.slf4j.LoggerFactory

private val logger = LoggerFactory.getLogger("org.example.database")

fun <T> withLogging(action: String, block: () -> T): T {
    logger.info("Database Access: $action")
    return try {
        val result = block()
        logger.info("Database Success: $action")
        result
    } catch (e: Exception) {
        logger.error("Database Failure: $action - ${e.message}", e)
        throw e
    }
}
