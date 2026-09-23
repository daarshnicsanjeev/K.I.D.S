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
    var attemptCount: Int = 0,
    var attachmentCount: Int = 0
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

    fun getNextPendingItemReverse(): StreamManifestItem? {
        return _items.lastOrNull { it.status == StreamItemStatus.PENDING }
    }

    fun findByFingerprint(fingerprint: String): StreamManifestItem? {
        return _items.firstOrNull { it.fingerprint == fingerprint }
    }

    /**
     * Resilient Multi-Factor Matching:
     * 1. Exact Fingerprint SHA-256 match
     * 2. Exact Title match (case-insensitive)
     * 3. Normalized Title prefix match (>= 20 chars)
     * 4. Content overlap (card text contains manifest title, or manifest preview contains card title)
     */
    fun findMatchingItem(fingerprint: String, title: String, cardText: String): StreamManifestItem? {
        // Tier 1: Exact fingerprint
        findByFingerprint(fingerprint)?.let { return it }

        val cleanTitle = title.trim().lowercase()
        if (cleanTitle.length >= 8) {
            // Tier 2: Exact title match
            _items.firstOrNull { it.title.trim().equals(cleanTitle, ignoreCase = true) }?.let { return it }

            // Tier 3: Substantial prefix match (first 25 characters)
            val prefix = cleanTitle.take(25)
            _items.firstOrNull {
                val itemTitle = it.title.trim().lowercase()
                itemTitle.startsWith(prefix) || cleanTitle.startsWith(itemTitle.take(25))
            }?.let { return it }
        }

        // Tier 4: Body content overlap
        if (cardText.length > 30) {
            _items.firstOrNull { item ->
                val itemTitle = item.title.trim()
                itemTitle.length >= 15 && cardText.contains(itemTitle, ignoreCase = true)
            }?.let { return it }
        }

        // Tier 5: Word / Token overlap (for titles with punctuation or localized script differences)
        if (cleanTitle.length >= 8) {
            val titleTokens = cleanTitle.split(Regex("""[\s\p{Punct}]+""")).filter { it.length > 2 }.toSet()
            if (titleTokens.size >= 2) {
                _items.firstOrNull { item ->
                    val itemTokens = item.title.lowercase().split(Regex("""[\s\p{Punct}]+""")).filter { it.length > 2 }.toSet()
                    val common = titleTokens.intersect(itemTokens)
                    val overlap = common.size.toFloat() / maxOf(titleTokens.size, itemTokens.size)
                    overlap >= 0.6f
                }?.let { return it }
            }
        }

        return null
    }

    fun isTargetBounded(targetIndex: Int, visibleIndices: List<Int>): Boolean {
        if (visibleIndices.isEmpty()) return false
        val min = visibleIndices.minOrNull() ?: return false
        val max = visibleIndices.maxOrNull() ?: return false
        return targetIndex in min..max
    }

    fun markCompleted(fingerprint: String, attachmentCount: Int = 0) {
        findByFingerprint(fingerprint)?.let {
            it.status = StreamItemStatus.COMPLETED
            it.attachmentCount = attachmentCount
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
