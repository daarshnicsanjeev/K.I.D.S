package com.kids.collector.domain.model

/**
 * Lifecycle status of an individual post card within the stream manifest.
 */
enum class StreamItemStatus {
    PENDING,
    ALREADY_SYNCED,
    IN_PROGRESS,
    COMPLETED,
    FAILED_SKIPPED
}

/**
 * Representation of a discovered Classroom stream item in the pre-flight manifest.
 */
data class StreamManifestItem(
    val index: Int,
    val fingerprint: String,
    val title: String,
    val previewText: String,
    var status: StreamItemStatus = StreamItemStatus.PENDING,
    var attemptCount: Int = 0
)

/**
 * Manifest tracking the boundaries and complete inventory of stream items discovered
 * during the pre-flight survey pass.
 */
class StreamManifest {
    private val _items = mutableListOf<StreamManifestItem>()
    val items: List<StreamManifestItem> get() = _items

    var startItemTitle: String? = null
        private set
    var endItemTitle: String? = null
        private set

    val totalCount: Int get() = _items.size

    val completedCount: Int
        get() = _items.count { it.status == StreamItemStatus.COMPLETED || it.status == StreamItemStatus.ALREADY_SYNCED }

    val pendingCount: Int
        get() = _items.count { it.status == StreamItemStatus.PENDING }

    val progressPercent: Int
        get() = if (totalCount == 0) 100 else ((completedCount.toFloat() / totalCount.toFloat()) * 100).toInt()

    fun addItem(fingerprint: String, title: String, previewText: String, isAlreadyCaptured: Boolean): Boolean {
        if (_items.any { it.fingerprint == fingerprint }) {
            return false // Already indexed
        }
        val nextIndex = _items.size + 1
        val item = StreamManifestItem(
            index = nextIndex,
            fingerprint = fingerprint,
            title = title,
            previewText = previewText,
            status = if (isAlreadyCaptured) StreamItemStatus.ALREADY_SYNCED else StreamItemStatus.PENDING
        )
        _items.add(item)

        if (startItemTitle == null) {
            startItemTitle = title
        }
        endItemTitle = title
        return true
    }

    fun getNextPendingItem(): StreamManifestItem? {
        return _items.firstOrNull { it.status == StreamItemStatus.PENDING }
    }

    fun findByFingerprint(fingerprint: String): StreamManifestItem? {
        return _items.firstOrNull { it.fingerprint == fingerprint }
    }

    fun markCompleted(fingerprint: String) {
        findByFingerprint(fingerprint)?.let {
            it.status = StreamItemStatus.COMPLETED
        }
    }

    fun markSkipped(fingerprint: String) {
        findByFingerprint(fingerprint)?.let {
            it.status = StreamItemStatus.FAILED_SKIPPED
        }
    }

    fun incrementAttempt(fingerprint: String): Int {
        val item = findByFingerprint(fingerprint) ?: return 0
        item.attemptCount++
        return item.attemptCount
    }

    fun isAllFinished(): Boolean {
        return _items.isNotEmpty() && _items.none { it.status == StreamItemStatus.PENDING || it.status == StreamItemStatus.IN_PROGRESS }
    }

    fun clear() {
        _items.clear()
        startItemTitle = null
        endItemTitle = null
    }
}
