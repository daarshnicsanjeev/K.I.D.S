package com.kids.collector.domain.router

import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.domain.model.StreamManifest
import com.kids.collector.domain.model.SyncStatus
import com.kids.collector.service.CrawlerTraceLogger

/**
 * Autonomous Notice & Attachment Reconciliation Engine
 *
 * Responsibilities:
 * 1. Re-links orphaned attachments from "Google Drive Shared Resources" notices
 *    back to their authentic Google Classroom notices via multi-tier title and token matching.
 * 2. Repairs Classroom notices whose text bodies were mistakenly overwritten by adjacent
 *    circulars during crawler mis-clicks.
 * 3. Deletes or purges empty dummy notices once their attachments have been reconciled.
 */
object NoticeReconciliationEngine {

    private val RECONCILIATION_STOP_WORDS = setOf(
        "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "zip", "rar",
        "ws", "worksheet", "worksheets", "sheet", "sheets", "notes", "notebook",
        "homework", "hw", "cw", "classwork", "practice", "answer", "key", "final",
        "std", "grade", "class", "ch", "chapter", "lesson", "unit", "and", "the",
        "for", "with", "part", "page", "textbook", "material", "assignment", "new",
        "uploaded", "shared", "resource", "resources", "folder",
        "the", "a", "an", "of", "in", "on", "at", "to", "from", "by",
        "la", "el", "los", "las", "un", "una", "de", "del", "en", "por", "para"
    )

    private val CURRICULUM_DOMAIN_SYNONYMS = mapOf(
        "even" to setOf("addition", "subtraction", "number", "numbers", "math", "mathematics"),
        "odd" to setOf("addition", "subtraction", "number", "numbers", "math", "mathematics"),
        "maze" to setOf("addition", "subtraction", "practice", "math", "mathematics", "numbers", "number"),
        "colouring" to setOf("addition", "subtraction", "practice", "math", "mathematics", "numbers", "number"),
        "coloring" to setOf("addition", "subtraction", "practice", "math", "mathematics", "numbers", "number"),
        "gingerbread" to setOf("addition", "subtraction", "practice", "math", "mathematics", "numbers", "number"),
        "pronoun" to setOf("pronombres", "spanish", "espanol"),
        "pronombres" to setOf("pronoun", "spanish", "espanol"),
        "hora" to setOf("time", "spanish", "espanol"),
        "time" to setOf("hora", "spanish", "espanol")
    )

    private val SUBJECT_EXCLUSIONS = mapOf(
        "science" to setOf("math", "maths", "mathematics", "addition", "subtraction", "multiplication", "division"),
        "math" to setOf("science", "circuit", "circuits", "electrical", "bones", "muscles", "habitat", "spanish", "hindi"),
        "spanish" to setOf("math", "science", "hindi"),
        "hindi" to setOf("math", "science", "spanish")
    )

    /**
     * Executes autonomous reconciliation across the entire database.
     * Returns the count of attachments successfully reconciled or rebalanced to Classroom notices.
     */
    suspend fun reconcile(database: KidsDatabase): Int {
        var reconciledCount = 0

        val allNotices = database.noticeDao().getAllNoticesDirect()
        val sharedResourceNotices = allNotices.filter { notice ->
            isSharedResourceNotice(notice.title)
        }

        val legitimateNotices = allNotices.filter { notice ->
            !isSharedResourceNotice(notice.title)
        }

        for (sharedNotice in sharedResourceNotices) {
            val attachments = database.attachmentDao().getAttachmentsForNotice(sharedNotice.noticeId)
            var remainingInShared = attachments.size

            for (att in attachments) {
                val matchedNotice = findMatchingNoticeForAttachment(att.fileName, legitimateNotices)
                if (matchedNotice != null) {
                    // Re-link attachment to matched notice
                    database.attachmentDao().update(
                        att.copy(
                            noticeId = matchedNotice.noticeId,
                            syncStatus = SyncStatus.PENDING.name
                        )
                    )

                    // Increment attachment count and mark notice pending so digests update
                    val currentCount = database.attachmentDao().getAttachmentsForNotice(matchedNotice.noticeId).size
                    database.noticeDao().update(
                        matchedNotice.copy(
                            attachmentCount = currentCount + 1,
                            syncStatus = SyncStatus.PENDING.name
                        )
                    )

                    reconciledCount++
                    remainingInShared--
                    CrawlerTraceLogger.log(
                        "RECONCILIATION",
                        "Re-linked attachment \"${att.fileName}\" -> Notice: \"${matchedNotice.title}\""
                    )
                }
            }

            // If dummy notice has 0 attachments left, purge it from database
            if (remainingInShared <= 0) {
                database.noticeDao().deleteNoticeById(sharedNotice.noticeId)
                CrawlerTraceLogger.log(
                    "RECONCILIATION",
                    "Purged empty placeholder notice \"${sharedNotice.title}\" (${sharedNotice.noticeId})"
                )
            } else {
                database.noticeDao().update(
                    sharedNotice.copy(attachmentCount = remainingInShared)
                )
            }
        }

        val rebalancedCount = rebalanceOverloadedNotices(database, legitimateNotices)
        reconciledCount += rebalancedCount

        repairCorruptedCircularBodies(database, legitimateNotices)

        return reconciledCount
    }

    /**
     * Cross-reconciles overloaded notices against empty curriculum notices.
     * Prevents cases where all level worksheets are dumped into a "Homework" post while
     * the "Practice sheets" post is left with 0 attachments.
     */
    private suspend fun rebalanceOverloadedNotices(
        database: KidsDatabase,
        notices: List<NoticeEntity>
    ): Int {
        var rebalancedCount = 0
        val emptyCurriculumNotices = notices.filter { notice ->
            notice.attachmentCount == 0 && !isSharedResourceNotice(notice.title)
        }
        if (emptyCurriculumNotices.isEmpty()) return 0

        val overloadedNotices = notices.filter { notice ->
            notice.attachmentCount >= 4 && !isSharedResourceNotice(notice.title)
        }
        if (overloadedNotices.isEmpty()) return 0

        for (emptyNotice in emptyCurriculumNotices) {
            val emptyTokens = extractSubstantiveTokens(StreamManifest.normalizeTitle(emptyNotice.title))
            if (emptyTokens.isEmpty()) continue

            // Find an overloaded notice that shares curriculum domain tokens with empty notice
            val relatedOverloaded = overloadedNotices.firstOrNull { overloaded ->
                val overloadedTokens = extractSubstantiveTokens(StreamManifest.normalizeTitle(overloaded.title))
                emptyTokens.any { eTok ->
                    overloadedTokens.contains(eTok) ||
                    (CURRICULUM_DOMAIN_SYNONYMS[eTok]?.any { overloadedTokens.contains(it) } == true)
                }
            } ?: continue

            val attachments = database.attachmentDao().getAttachmentsForNotice(relatedOverloaded.noticeId)
            val movedAttachments = mutableListOf<AttachmentEntity>()

            for (att in attachments) {
                val attBase = att.fileName.substringBeforeLast('.').trim().lowercase()
                val isAnswerKeyOrSpecificToOverloaded = attBase.contains("answer") ||
                        (StreamManifest.normalizeTitle(relatedOverloaded.title).contains("homework") && attBase.contains("homework"))

                // If it's a generic Level or practice worksheet and not specific to the overloaded title
                val isLevelWorksheet = attBase.contains("level") ||
                        (emptyTokens.any { attBase.contains(it) } && !isAnswerKeyOrSpecificToOverloaded)

                if (isLevelWorksheet && !isAnswerKeyOrSpecificToOverloaded) {
                    movedAttachments.add(att)
                }
            }

            if (movedAttachments.isNotEmpty()) {
                for (att in movedAttachments) {
                    database.attachmentDao().update(
                        att.copy(
                            noticeId = emptyNotice.noticeId,
                            syncStatus = SyncStatus.PENDING.name
                        )
                    )
                    rebalancedCount++
                    CrawlerTraceLogger.log(
                        "RECONCILIATION",
                        "Rebalanced attachment \"${att.fileName}\" from \"${relatedOverloaded.title.take(30)}\" -> \"${emptyNotice.title.take(30)}\""
                    )
                }

                val newEmptyCount = database.attachmentDao().getAttachmentsForNotice(emptyNotice.noticeId).size
                val newOverloadedCount = database.attachmentDao().getAttachmentsForNotice(relatedOverloaded.noticeId).size

                database.noticeDao().update(
                    emptyNotice.copy(
                        attachmentCount = newEmptyCount,
                        syncStatus = SyncStatus.PENDING.name
                    )
                )
                database.noticeDao().update(
                    relatedOverloaded.copy(
                        attachmentCount = newOverloadedCount,
                        syncStatus = SyncStatus.PENDING.name
                    )
                )
            }
        }
        return rebalancedCount
    }

    /**
     * Checks if a notice is a dummy or generic folder notice.
     */
    fun isSharedResourceNotice(title: String): Boolean {
        val lower = title.trim().lowercase()
        return lower == "google drive shared resources" ||
                lower.startsWith("shared folder:") ||
                lower == "shared resources"
    }

    /**
     * Checks if subject domains are incompatible (e.g. Science attachment matching Math notice).
     */
    private fun isSubjectIncompatible(fileTokens: Set<String>, noticeTokens: Set<String>): Boolean {
        for ((subj, exclusions) in SUBJECT_EXCLUSIONS) {
            val hasFileSubject = fileTokens.contains(subj) || fileTokens.any { exclusions.contains(it) }
            val hasNoticeSubject = noticeTokens.contains(subj) || noticeTokens.any { exclusions.contains(it) }
            if (hasFileSubject && hasNoticeSubject && fileTokens.intersect(exclusions).isNotEmpty() && noticeTokens.intersect(exclusions).isEmpty()) {
                return true
            }
        }
        return false
    }

    /**
     * Finds the best matching Classroom notice for an attachment file name using:
     * 1. Substantive token overlap & curriculum domain synonyms
     * 2. Direct stem containment
     * 3. Normalized title similarity
     * 4. Empty notice priority & attachment load balancing
     */
    fun findMatchingNoticeForAttachment(
        fileName: String,
        candidates: List<NoticeEntity>
    ): NoticeEntity? {
        val cleanBaseName = fileName.substringBeforeLast('.').trim().lowercase()
        val fileTokens = extractSubstantiveTokens(cleanBaseName)

        var bestCandidate: NoticeEntity? = null
        var bestScore = 0f

        for (notice in candidates) {
            val normNoticeTitle = StreamManifest.normalizeTitle(notice.title)
            val noticeTokens = extractSubstantiveTokens(normNoticeTitle)

            // Direct containment check (e.g., "Spanish Pronoun" in "Los pronombres- The Pronouns" or vice versa)
            val isDirectContainment = (cleanBaseName.length >= 6 && normNoticeTitle.contains(cleanBaseName)) ||
                    (normNoticeTitle.length >= 6 && cleanBaseName.contains(normNoticeTitle))

            if (isDirectContainment) {
                val score = 1.0f
                if (score > bestScore) {
                    bestScore = score
                    bestCandidate = notice
                }
                continue
            }

            // Guard against incompatible subject domains (e.g. Science matching Math)
            if (isSubjectIncompatible(fileTokens, noticeTokens)) {
                continue
            }

            // Stem, token overlap and curriculum domain synonym check
            if (fileTokens.isNotEmpty() && noticeTokens.isNotEmpty()) {
                val commonTokens = fileTokens.filter { fTok ->
                    noticeTokens.any { nTok ->
                        fTok == nTok ||
                        (fTok.length >= 4 && nTok.startsWith(fTok.take(4))) ||
                        (nTok.length >= 4 && fTok.startsWith(nTok.take(4))) ||
                        isStemEquivalent(fTok, nTok) ||
                        (CURRICULUM_DOMAIN_SYNONYMS[fTok]?.contains(nTok) == true) ||
                        (CURRICULUM_DOMAIN_SYNONYMS[nTok]?.contains(fTok) == true)
                    }
                }

                if (commonTokens.isNotEmpty()) {
                    val minLen = minOf(fileTokens.size, noticeTokens.size).coerceAtLeast(1)
                    val maxLen = maxOf(fileTokens.size, noticeTokens.size).coerceAtLeast(1)
                    val fileRatio = commonTokens.size.toFloat() / fileTokens.size
                    var normScore = (commonTokens.size.toFloat() / minLen * 0.7f) + (commonTokens.size.toFloat() / maxLen * 0.3f)

                    // Boost empty curriculum notices to balance attachments fairly
                    if (notice.attachmentCount == 0) {
                        normScore += 0.25f
                    }

                    if (fileRatio >= 0.33f && normScore > bestScore) {
                        bestScore = normScore
                        bestCandidate = notice
                    }
                }
            }
        }

        return bestCandidate
    }

    private fun extractSubstantiveTokens(text: String): Set<String> {
        return text.split(Regex("""[\s\p{Punct}]+"""))
            .map { it.trim().lowercase() }
            .filter { it.length >= 3 && !RECONCILIATION_STOP_WORDS.contains(it) }
            .toSet()
    }

    /**
     * Handles bilingual or morphological variants like "pronoun" / "pronombres", "hora" / "time".
     */
    private fun isStemEquivalent(a: String, b: String): Boolean {
        if (a == b) return true
        if (a.startsWith("pronoun") && (b.startsWith("pronombr") || b.startsWith("pronoun"))) return true
        if (b.startsWith("pronoun") && (a.startsWith("pronombr") || a.startsWith("pronoun"))) return true
        if (a.startsWith("pronombr") && b.startsWith("pronombr")) return true
        if (a == "time" && b == "hora") return true
        if (b == "time" && a == "hora") return true
        if ((a == "spanish" && b == "espanol") || (a == "espanol" && b == "spanish")) return true
        return false
    }

    /**
     * Resets bodies of curriculum notices that were corrupted by accidental circular misclicks.
     */
    private suspend fun repairCorruptedCircularBodies(
        database: KidsDatabase,
        notices: List<NoticeEntity>
    ) {
        val weatherKeywords = setOf("heavy rainfall", "orange alert", "red alert", "waterlogging", "school will remain closed")
        for (notice in notices) {
            val lowerTitle = notice.title.lowercase()
            val isCurriculumTitle = !lowerTitle.contains("alert") &&
                    !lowerTitle.contains("weather") &&
                    !lowerTitle.contains("rain") &&
                    !lowerTitle.contains("circular") &&
                    !lowerTitle.contains("holiday")

            val lowerBody = notice.body.lowercase()
            val containsCircularText = weatherKeywords.any { lowerBody.contains(it) }

            if (isCurriculumTitle && containsCircularText) {
                CrawlerTraceLogger.log(
                    "RECONCILIATION",
                    "Repaired notice \"${notice.title}\" by stripping mis-clicked circular body text."
                )
                database.noticeDao().update(
                    notice.copy(
                        body = "",
                        syncStatus = SyncStatus.PENDING.name
                    )
                )
            }
        }
    }
}
