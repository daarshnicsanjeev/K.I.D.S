package com.kids.collector.domain.dedupe

import java.security.MessageDigest

/**
 * SHA-256 Deduplication & Content Fingerprinting Engine
 */
class DeduplicationEngine {

    fun computeNoticeHash(
        childId: String,
        sourceApp: String,
        title: String,
        body: String
    ): String {
        val raw = "$childId|$sourceApp|${title.trim()}|${body.trim()}"
        return sha256(raw)
    }

    fun computeFileHash(bytes: ByteArray): String {
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(bytes)
        return digest.joinToString("") { "%02x".format(it) }
    }

    fun computeFileHash(file: java.io.File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { fis ->
            val buffer = ByteArray(8192)
            var read: Int
            while (fis.read(buffer).also { read = it } != -1) {
                md.update(buffer, 0, read)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    private fun sha256(input: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(input.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }
}
