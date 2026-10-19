package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.dedupe.DeduplicationEngine
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class DeduplicationHashTest {

    private lateinit var deduplicationEngine: DeduplicationEngine

    @BeforeEach
    fun setUp() {
        deduplicationEngine = DeduplicationEngine()
    }

    @Test
    fun `identical notices generate identical SHA-256 hashes`() {
        val hash1 = deduplicationEngine.computeNoticeHash(
            childId = "c1",
            sourceApp = "com.google.android.apps.classroom",
            title = "Math Assignment",
            body = "Exercises 1-5"
        )
        val hash2 = deduplicationEngine.computeNoticeHash(
            childId = "c1",
            sourceApp = "com.google.android.apps.classroom",
            title = "Math Assignment",
            body = "Exercises 1-5"
        )

        assertThat(hash1).isNotEmpty()
        assertThat(hash1).isEqualTo(hash2)
    }

    @Test
    fun `notices with different bodies or children produce distinct hashes`() {
        val hash1 = deduplicationEngine.computeNoticeHash(
            childId = "c1",
            sourceApp = "com.google.android.apps.classroom",
            title = "Math Assignment",
            body = "Exercises 1-5"
        )
        val hash2 = deduplicationEngine.computeNoticeHash(
            childId = "c2",
            sourceApp = "com.google.android.apps.classroom",
            title = "Math Assignment",
            body = "Exercises 1-5"
        )

        assertThat(hash1).isNotEqualTo(hash2)
    }
}
