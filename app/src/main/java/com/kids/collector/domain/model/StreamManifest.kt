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

    fun addItem(
        fingerprint: String,
        title: String,
        previewText: String,
        isAlreadyCaptured: Boolean
    ): Boolean {
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
     * 2. Normalized Title match (stripping 'New material:', timestamps, and dates)
     * 3. Raw Title match (case-insensitive)
     * 4. Normalized Title prefix or containment match
     * 5. Word / Token overlap
     * 6. Body content overlap
     *
     * Prioritizes PENDING items so duplicate-titled notices on the same date are resolved sequentially.
     */
    fun findMatchingItem(
        fingerprint: String,
        title: String,
        cardText: String,
        preferPending: Boolean = true
    ): StreamManifestItem? {
        // Tier 1: Exact fingerprint SHA-256 match
        findByFingerprint(fingerprint)?.let { return it }

        val normTitle = normalizeTitle(title)
        val cleanTitle = title.trim().lowercase()

        fun List<StreamManifestItem>.pickBest(): StreamManifestItem? {
            return if (preferPending) (this.firstOrNull { it.status == StreamItemStatus.PENDING } ?: this.firstOrNull())
            else this.firstOrNull()
        }

        // Tier 2: Normalized exact title match (handles "New material: The Articles" vs "The Articles")
        if (normTitle.isNotBlank() && !normTitle.equals("classroom notice", ignoreCase = true)) {
            val matches = _items.filter { normalizeTitle(it.title) == normTitle }
            matches.pickBest()?.let { return it }
        }

        if (cleanTitle.length >= 6 && !cleanTitle.equals("classroom notice", ignoreCase = true)) {
            // Tier 3: Raw exact title match (case-insensitive)
            val rawMatches = _items.filter { it.title.trim().equals(cleanTitle, ignoreCase = true) }
            rawMatches.pickBest()?.let { return it }

            // Tier 4: Substantial prefix or containment match
            val prefix = normTitle.take(25)
            if (prefix.length >= 6) {
                val prefixMatches = _items.filter {
                    val itemNorm = normalizeTitle(it.title)
                    itemNorm.startsWith(prefix) || normTitle.startsWith(itemNorm.take(25)) ||
                            (itemNorm.length >= 6 && normTitle.contains(itemNorm)) ||
                            (normTitle.length >= 6 && itemNorm.contains(normTitle))
                }
                prefixMatches.pickBest()?.let { return it }
            }

            // Tier 5: Word / Token overlap (filtering generic educational stop words)
            val titleTokens = normTitle.split(Regex("""[\s\p{Punct}]+"""))
                .filter { it.length >= 3 && !GENERIC_TITLE_STOP_WORDS.contains(it) }
                .toSet()
            if (titleTokens.isNotEmpty()) {
                val tokenMatches = _items.filter { item ->
                    val itemTokens = normalizeTitle(item.title).split(Regex("""[\s\p{Punct}]+"""))
                        .filter { it.length >= 3 && !GENERIC_TITLE_STOP_WORDS.contains(it) }
                        .toSet()
                    val common = titleTokens.intersect(itemTokens)
                    if (common.isEmpty()) return@filter false
                    val maxLen = maxOf(titleTokens.size, itemTokens.size)
                    val overlap = common.size.toFloat() / maxLen
                    overlap >= 0.6f || (common.size >= 2 && overlap >= 0.5f)
                }
                tokenMatches.pickBest()?.let { return it }
            }
        }

        // Tier 6: Body content overlap
        if (cardText.length > 30) {
            val bodyMatches = _items.filter { item ->
                val normItemTitle = normalizeTitle(item.title)
                normItemTitle.length >= 6 && cardText.contains(normItemTitle, ignoreCase = true)
            }
            bodyMatches.pickBest()?.let { return it }
        }

        return null
    }

    companion object {
        private val GENERIC_TITLE_STOP_WORDS = setOf(
            "sheet", "sheets", "notes", "grade", "homework", "pdf", "ws", "ch", "chapter",
            "lesson", "unit", "term", "class", "answer", "key", "work", "part", "page",
            "dear", "parents", "students", "material", "assignment", "circular", "reference"
        )

        fun normalizeTitle(raw: String): String {
            return raw
                .replace(Regex("""^(?:new\s+material|new\s+assignment|new\s+question|announcement|material|assignment)\s*:\s*""", RegexOption.IGNORE_CASE), "")
                .replace(Regex("""\b(?:posted\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:\s*\(edited[^\)]*\))?.*""", RegexOption.IGNORE_CASE), "")
                .replace(Regex("""[\r\n]+"""), " ")
                .trim()
                .lowercase()
        }
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

    fun markItemCompleted(targetIndex: Int, attachmentCount: Int = 0) {
        _items.firstOrNull { it.index == targetIndex }?.let {
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

    fun resetItemsForRecovery(titlesToRecover: Set<String>): Int {
        var resetCount = 0
        for (item in _items) {
            val itemTitle = item.title.trim().lowercase()
            val matches = titlesToRecover.any { title ->
                val clean = title.trim().lowercase()
                clean == itemTitle || itemTitle.startsWith(clean.take(25)) || clean.startsWith(itemTitle.take(25))
            }
            if (matches) {
                item.status = StreamItemStatus.PENDING
                item.attemptCount = 0
                resetCount++
            }
        }
        return resetCount
    }

    fun clear() {
        _items.clear()
        startItemTitle = null
        endItemTitle = null
    }
}
