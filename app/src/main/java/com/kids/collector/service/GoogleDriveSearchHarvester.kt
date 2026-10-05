package com.kids.collector.service

import android.content.Context
import android.content.Intent
import android.graphics.Rect
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo
import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.service.GoogleDriveSharedHarvester.Companion.DRIVE_PACKAGE_NAME
import com.kids.collector.service.GoogleDriveSharedHarvester.Companion.matchesDriveItem
import com.kids.collector.service.GoogleDriveSharedHarvester.Companion.splitTitleAndExtension
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.util.Locale

/**
 * Autonomous Google Drive Search Harvester (Pass 4).
 *
 * Implements Pass 4 of the accelerated ingestion pipeline:
 * 1. Checks which attachments were discovered in Google Classroom notices/stream but were NOT present in
 *    the Google Drive "Shared with me" tab (Pass 3).
 * 2. Uses Google Drive's built-in search bar to search for each uncaptured file by its full file name
 *    and derived query variations.
 * 3. Inspects autocomplete suggestions and full search results for matching items.
 * 4. Triggers the 3-dots "More actions" -> "Send a copy" menu -> K.I.D.S. Vault share target in bulk.
 * 5. Verifies ingestion into SQLite [KidsDatabase] and returns Google Drive to a clean state.
 */
class GoogleDriveSearchHarvester(
    private val context: Context,
    private val serviceScope: CoroutineScope,
    private val database: KidsDatabase,
    private val crawlerOverlay: FloatingCrawlerOverlay?,
    private val rootInActiveWindowProvider: () -> AccessibilityNodeInfo?,
    private val dispatchTapAction: suspend (Float, Float) -> Boolean,
    private val dispatchSwipeAction: suspend (Float, Float, Float, Float, Long) -> Boolean,
    private val selectKidsInChooserAction: suspend () -> Boolean,
    private val waitForConditionAction: suspend (Long, Long, () -> Boolean) -> Boolean,
    private val dispatchBackAction: suspend () -> Boolean
) {

    companion object {
        private const val SETTLING_DELAY_MILLISECONDS = 600L
        private const val QUERY_INPUT_DELAY_MILLISECONDS = 800L
        private const val SEARCH_RESULTS_TIMEOUT_MILLISECONDS = 3500L
        private const val FOREGROUND_POLL_INTERVAL_MILLISECONDS = 250L
        private const val FOREGROUND_WAIT_TIMEOUT_MILLISECONDS = 8000L
        private const val INGESTION_WAIT_TIMEOUT_MILLISECONDS = 5000L
        private const val SWIPE_DURATION_MILLISECONDS = 300L
        private const val MAX_UNCOLLAPSE_ATTEMPTS = 3
        private const val MAX_TREE_INSPECTION_DEPTH = 6

        /**
         * Builds prioritized search queries for an attachment filename:
         * 1. Exact full file name (e.g. "Division by 10 and 100-Ans.jpg")
         * 2. File title without extension (e.g. "Division by 10 and 100-Ans")
         * 3. Normalized title with separators replaced by spaces (e.g. "Division by 10 and 100 Ans")
         */
        fun buildSearchQueries(fileName: String): List<String> {
            val queryList = mutableListOf<String>()
            val trimmedName = fileName.trim()
            if (trimmedName.isNotBlank()) {
                queryList.add(trimmedName)
            }

            val (baseName, _) = splitTitleAndExtension(trimmedName)
            val cleanBaseName = baseName.trim()
            if (cleanBaseName.isNotBlank() && cleanBaseName != trimmedName) {
                queryList.add(cleanBaseName)
            }

            val normalizedName = cleanBaseName
                .replace(Regex("""[_\-]+"""), " ")
                .replace(Regex("""\s+"""), " ")
                .trim()
            if (normalizedName.isNotBlank() && normalizedName != cleanBaseName && normalizedName != trimmedName) {
                queryList.add(normalizedName)
            }

            return queryList.distinct()
        }

        fun findSendCopyNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
            val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
            val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
            val isSendCopy = text.contains("send a copy") || text.contains("send copy") || text.contains("send file") ||
                    text.contains("share a copy") || desc.contains("send a copy") || desc.contains("send copy") ||
                    desc.contains("send file") || desc.contains("share a copy")
            if (isSendCopy) {
                return if (node.isClickable) {
                    AccessibilityNodeInfo.obtain(node)
                } else {
                    findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node)
                }
            }
            for (index in 0 until node.childCount) {
                val child = node.getChild(index) ?: continue
                val found = findSendCopyNode(child)
                if (found != null) {
                    child.recycle()
                    return found
                }
                child.recycle()
            }
            return null
        }

        private fun findClickableAncestor(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
            var current: AccessibilityNodeInfo? = node.parent
            var depth = 0
            while (current != null && depth < MAX_TREE_INSPECTION_DEPTH) {
                if (current.isClickable) {
                    return current
                }
                val parent = current.parent
                current.recycle()
                current = parent
                depth++
            }
            current?.recycle()
            return null
        }
    }

    data class SearchResultItem(
        val title: String,
        val subtitle: String,
        val moreActionsNode: AccessibilityNodeInfo,
        val moreActionsBounds: Rect
    )

    /**
     * Executes the Pass 4 Google Drive Search Harvest cycle for missing Classroom attachments.
     * Returns the total count of missing files successfully dispatched to K.I.D.S. Vault.
     */
    suspend fun executeSearchHarvest(missingAttachments: List<AttachmentEntity>): Int {
        val pendingList = missingAttachments.filter { attachment ->
            val freshRecord = database.attachmentDao().getAttachmentById(attachment.attachmentId)
            freshRecord == null || freshRecord.localUri.isBlank()
        }

        if (pendingList.isEmpty()) {
            CrawlerTraceLogger.log("DRIVE_SEARCH", "All attachments already captured. Skipping Pass 4.")
            return 0
        }

        CrawlerTraceLogger.log(
            "DRIVE_SEARCH",
            "Starting Phase 4: Google Drive Search Harvester for ${pendingList.size} uncaptured attachments..."
        )
        crawlerOverlay?.updateStatus("Phase 4: Drive Search", "Searching Drive for ${pendingList.size} missing files...")

        ensureDriveForeground()
        var totalDispatchedCount = 0

        GoogleDriveSharedHarvester.isDriveHarvestingActive = true
        try {
            for ((itemIndex, attachment) in pendingList.withIndex()) {
                if (!serviceScope.isActive || crawlerOverlay?.isAutoScrollingActive() == false) {
                    CrawlerTraceLogger.log("DRIVE_SEARCH", "Search harvest interrupted by user or cancellation.")
                    break
                }

                // Verify the attachment hasn't been completed concurrently by background sync
                val currentRecord = database.attachmentDao().getAttachmentById(attachment.attachmentId)
                if (currentRecord != null && currentRecord.localUri.isNotBlank()) {
                    CrawlerTraceLogger.log(
                        "DRIVE_SEARCH",
                        "Attachment \"${attachment.fileName}\" already saved concurrently. Skipping search."
                    )
                    continue
                }

                crawlerOverlay?.updateStatus(
                    "Phase 4: Drive Search (${itemIndex + 1}/${pendingList.size})",
                    "Searching: ${attachment.fileName.take(28)}..."
                )

                val wasHarvested = searchAndDispatchAttachment(attachment)
                if (wasHarvested) {
                    totalDispatchedCount++
                    CrawlerTraceLogger.log(
                        "DRIVE_SEARCH",
                        "✓ Successfully harvested \"${attachment.fileName}\" via Drive Search (total: $totalDispatchedCount)"
                    )
                    waitForAttachmentIngestion(attachment.attachmentId)
                } else {
                    CrawlerTraceLogger.log(
                        "DRIVE_SEARCH",
                        "✗ File \"${attachment.fileName}\" could not be located or shared via Drive search."
                    )
                }
                delay(SETTLING_DELAY_MILLISECONDS)
            }
        } finally {
            GoogleDriveSharedHarvester.isDriveHarvestingActive = false
            exitSearchModeToDriveRoot()
        }

        CrawlerTraceLogger.log(
            "DRIVE_SEARCH",
            "Phase 4 Google Drive Search Harvest completed: $totalDispatchedCount files dispatched to K.I.D.S. Vault."
        )
        return totalDispatchedCount
    }

    /**
     * Attempts to search for an individual attachment on Google Drive and dispatch it to K.I.D.S. Vault.
     */
    private suspend fun searchAndDispatchAttachment(attachment: AttachmentEntity): Boolean {
        val searchQueries = buildSearchQueries(attachment.fileName)
        CrawlerTraceLogger.log(
            "DRIVE_SEARCH",
            "Searching Drive for \"${attachment.fileName}\" using ${searchQueries.size} query variations: $searchQueries"
        )

        for (query in searchQueries) {
            if (!serviceScope.isActive || crawlerOverlay?.isAutoScrollingActive() == false) return false

            val isInputReady = prepareSearchInputField()
            if (!isInputReady) {
                CrawlerTraceLogger.log("DRIVE_SEARCH", "Unable to open or prepare Drive search input field.")
                continue
            }

            val inputSuccess = enterSearchQuery(query)
            if (!inputSuccess) {
                CrawlerTraceLogger.log("DRIVE_SEARCH", "Failed to input search query: \"$query\"")
                continue
            }

            delay(QUERY_INPUT_DELAY_MILLISECONDS)

            // Step 1: Scan autocomplete suggestions / direct search list
            var matchedItem = scanForMatchingItem(attachment.fileName)

            // Step 2: If no direct match in suggestions, submit query to load full search results page
            if (matchedItem == null) {
                val wasSubmitted = submitSearchQuery(query)
                if (wasSubmitted) {
                    delay(QUERY_INPUT_DELAY_MILLISECONDS)
                    matchedItem = scanForMatchingItem(attachment.fileName)
                }
            }

            if (matchedItem != null) {
                CrawlerTraceLogger.log(
                    "DRIVE_SEARCH",
                    "Discovered matching Drive search result: \"${matchedItem.title}\" for attachment \"${attachment.fileName}\""
                )
                val isDispatched = dispatchSearchResultItem(matchedItem)
                if (isDispatched) {
                    clearSearchQueryOrDismiss()
                    return true
                }
            }

            // Step 3: Handle potential full-screen document viewer opened by tap
            val viewerDispatched = handleActiveViewerIfPresent(attachment.fileName)
            if (viewerDispatched) {
                clearSearchQueryOrDismiss()
                return true
            }

            clearSearchQueryOrDismiss()
            delay(SETTLING_DELAY_MILLISECONDS)
        }

        return false
    }

    /**
     * Prepares and exposes the Google Drive search input field (EditText).
     */
    private suspend fun prepareSearchInputField(): Boolean {
        // 1. Check if EditText is already visible and ready in the active window
        val initialRoot = rootInActiveWindowProvider()
        if (initialRoot != null) {
            val existingInput = findSearchInputNode(initialRoot)
            if (existingInput != null) {
                existingInput.recycle()
                initialRoot.recycle()
                return true
            }
            initialRoot.recycle()
        }

        // 2. Locate search bar, uncollapsing top bar if scrolled down
        var searchBarNode: AccessibilityNodeInfo? = null
        for (attempt in 0 until MAX_UNCOLLAPSE_ATTEMPTS) {
            val root = rootInActiveWindowProvider()
            if (root != null) {
                searchBarNode = findDriveSearchBarNode(root)
                root.recycle()
            }
            if (searchBarNode != null) break

            CrawlerTraceLogger.log(
                "DRIVE_SEARCH",
                "Search bar not visible (attempt ${attempt + 1}/$MAX_UNCOLLAPSE_ATTEMPTS). Swiping down to expose top search bar..."
            )
            val displayMetrics = context.resources.displayMetrics
            val swipeCenterX = displayMetrics.widthPixels / 2f
            val swipeStartY = displayMetrics.heightPixels * 0.20f
            val swipeEndY = displayMetrics.heightPixels * 0.70f
            dispatchSwipeAction(swipeCenterX, swipeStartY, swipeCenterX, swipeEndY, SWIPE_DURATION_MILLISECONDS)
            delay(SETTLING_DELAY_MILLISECONDS)
        }

        if (searchBarNode == null) {
            CrawlerTraceLogger.log("DRIVE_SEARCH", "Could not locate Drive search bar on current screen.")
            return false
        }

        // Tap the search bar to enter search mode
        val clicked = performVerifiedAccessibilityClick(searchBarNode)
        searchBarNode.recycle()

        if (!clicked) {
            val displayMetrics = context.resources.displayMetrics
            val fallbackTapX = displayMetrics.widthPixels / 2f
            val fallbackTapY = displayMetrics.density * 60f
            dispatchTapAction(fallbackTapX, fallbackTapY)
        }

        // Wait for search EditText to appear
        return waitForConditionAction(SEARCH_RESULTS_TIMEOUT_MILLISECONDS, FOREGROUND_POLL_INTERVAL_MILLISECONDS) {
            val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            val input = findSearchInputNode(root)
            val isFound = input != null
            input?.recycle()
            root.recycle()
            isFound
        }
    }

    /**
     * Enters a text query into the focused Google Drive search EditText.
     */
    private fun enterSearchQuery(query: String): Boolean {
        val root = rootInActiveWindowProvider() ?: return false
        val inputNode = findSearchInputNode(root)
        if (inputNode == null) {
            root.recycle()
            return false
        }

        inputNode.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
        val arguments = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, query)
        }
        val didSetText = inputNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
        inputNode.recycle()
        root.recycle()
        return didSetText
    }

    /**
     * Submits the entered query by clicking the "Search in Drive for <query>" suggestion row or search action button.
     */
    private suspend fun submitSearchQuery(query: String): Boolean {
        val root = rootInActiveWindowProvider() ?: return false
        val submitNode = findSearchSubmitNode(root, query)
        if (submitNode != null) {
            val clicked = performVerifiedAccessibilityClick(submitNode)
            submitNode.recycle()
            root.recycle()
            return clicked
        }
        root.recycle()
        return false
    }

    /**
     * Scans visible nodes in the search view / results list for an item matching the target attachment.
     */
    private fun scanForMatchingItem(targetFileName: String): SearchResultItem? {
        val root = rootInActiveWindowProvider() ?: return null
        val items = mutableListOf<SearchResultItem>()
        collectSearchResultsRecursively(root, items)
        root.recycle()

        for (item in items) {
            if (matchesDriveItem(item.title, targetFileName)) {
                return item
            }
        }

        // Clean up unselected item nodes
        for (item in items) {
            item.moreActionsNode.recycle()
        }
        return null
    }

    /**
     * Recursively collects items that have a dedicated "More actions for <title>" button.
     */
    private fun collectSearchResultsRecursively(node: AccessibilityNodeInfo, outList: MutableList<SearchResultItem>) {
        val contentDesc = node.contentDescription?.toString()?.trim() ?: ""
        val rawTitle = when {
            contentDesc.startsWith("More actions for ", ignoreCase = true) -> contentDesc.substringAfter("More actions for ", "").trim()
            contentDesc.startsWith("More options for ", ignoreCase = true) -> contentDesc.substringAfter("More options for ", "").trim()
            contentDesc.startsWith("Options for ", ignoreCase = true) -> contentDesc.substringAfter("Options for ", "").trim()
            contentDesc.startsWith("Action menu for ", ignoreCase = true) -> contentDesc.substringAfter("Action menu for ", "").trim()
            else -> ""
        }

        if (rawTitle.isNotBlank()) {
            val bounds = Rect()
            node.getBoundsInScreen(bounds)
            val representativeNode = if (node.isClickable) {
                AccessibilityNodeInfo.obtain(node)
            } else {
                findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node)
            }

            outList.add(
                SearchResultItem(
                    title = rawTitle,
                    subtitle = "",
                    moreActionsNode = representativeNode,
                    moreActionsBounds = bounds
                )
            )
            return
        }

        for (index in 0 until node.childCount) {
            val child = node.getChild(index) ?: continue
            collectSearchResultsRecursively(child, outList)
            child.recycle()
        }
    }

    /**
     * Dispatches a matching search result item to K.I.D.S. Vault via its 3-dots action menu -> "Send a copy".
     */
    private suspend fun dispatchSearchResultItem(item: SearchResultItem): Boolean {
        var openedActionSheet = performVerifiedAccessibilityClick(item.moreActionsNode)
        item.moreActionsNode.recycle()

        if (!openedActionSheet) {
            val tapX = item.moreActionsBounds.centerX().toFloat()
            val tapY = item.moreActionsBounds.centerY().toFloat()
            CrawlerTraceLogger.log(
                "DRIVE_SEARCH",
                "Accessibility click did not open 3-dots for \"${item.title}\". Falling back to physical tap at ($tapX, $tapY)..."
            )
            openedActionSheet = dispatchTapAction(tapX, tapY)
        }

        if (!openedActionSheet) {
            CrawlerTraceLogger.log("DRIVE_SEARCH", "Failed to trigger 3-dots menu for \"${item.title}\".")
            return false
        }

        delay(SETTLING_DELAY_MILLISECONDS)

        // Locate "Send a copy" in the bottom sheet
        var sendCopyNode: AccessibilityNodeInfo? = null
        waitForConditionAction(3000L, 150L) {
            val sheetRoot = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            sendCopyNode = findSendCopyNode(sheetRoot)
            sheetRoot.recycle()
            sendCopyNode != null
        }

        if (sendCopyNode == null) {
            CrawlerTraceLogger.log("DRIVE_SEARCH", "'Send a copy' option not found in action sheet for \"${item.title}\".")
            dispatchBackAction()
            return false
        }

        val clickedSendCopy = performVerifiedAccessibilityClick(sendCopyNode)
        sendCopyNode?.recycle()

        if (!clickedSendCopy) {
            CrawlerTraceLogger.log("DRIVE_SEARCH", "Failed to click 'Send a copy' option.")
            dispatchBackAction()
            return false
        }

        // Select K.I.D.S. in the system share sheet
        val isDispatchedToKids = selectKidsInChooserAction()
        if (!isDispatchedToKids) {
            CrawlerTraceLogger.log("DRIVE_SEARCH", "Failed to select K.I.D.S. in system chooser.")
            return false
        }

        waitForDriveForeground(FOREGROUND_WAIT_TIMEOUT_MILLISECONDS)
        return true
    }

    /**
     * Auto-recovers and dispatches if clicking an item opened Drive's full-screen viewer instead of the bottom sheet.
     */
    private suspend fun handleActiveViewerIfPresent(targetFileName: String): Boolean {
        val root = rootInActiveWindowProvider() ?: return false
        val isViewer = isDriveViewerScreen(root)
        if (!isViewer) {
            root.recycle()
            return false
        }

        CrawlerTraceLogger.log("DRIVE_SEARCH", "Drive full-screen viewer active for target \"$targetFileName\". Checking top options menu...")
        val viewerMoreNode = findViewerMoreOptionsNode(root)
        root.recycle()

        if (viewerMoreNode != null) {
            val clickedMenu = performVerifiedAccessibilityClick(viewerMoreNode)
            viewerMoreNode.recycle()
            if (clickedMenu) {
                delay(SETTLING_DELAY_MILLISECONDS)
                var sendCopyNode: AccessibilityNodeInfo? = null
                val sheetRoot = rootInActiveWindowProvider()
                if (sheetRoot != null) {
                    sendCopyNode = findSendCopyNode(sheetRoot)
                    sheetRoot.recycle()
                }

                if (sendCopyNode != null) {
                    performVerifiedAccessibilityClick(sendCopyNode)
                    sendCopyNode.recycle()
                    selectKidsInChooserAction()
                    waitForDriveForeground(FOREGROUND_WAIT_TIMEOUT_MILLISECONDS)
                    dispatchBackAction()
                    return true
                }
            }
        }

        dispatchBackAction()
        return false
    }

    /**
     * Clears the current query from the search input field or presses back to return to the search bar.
     */
    private suspend fun clearSearchQueryOrDismiss() {
        val root = rootInActiveWindowProvider()
        if (root != null) {
            val clearButton = findClearSearchButton(root)
            if (clearButton != null) {
                performVerifiedAccessibilityClick(clearButton)
                clearButton.recycle()
                root.recycle()
                delay(300L)
                return
            }

            val inputNode = findSearchInputNode(root)
            if (inputNode != null) {
                val arguments = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, "")
                }
                inputNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
                inputNode.recycle()
            }
            root.recycle()
        }
        dispatchBackAction()
        delay(300L)
    }

    /**
     * Exits search mode and returns Google Drive to its top-level root screen.
     */
    private suspend fun exitSearchModeToDriveRoot() {
        var attempts = 0
        while (attempts < 4) {
            val root = rootInActiveWindowProvider()
            if (root == null) {
                dispatchBackAction()
                delay(300L)
                attempts++
                continue
            }

            val hasSearchInput = findSearchInputNode(root) != null
            val hasSearchBar = findDriveSearchBarNode(root) != null
            root.recycle()

            if (hasSearchBar && !hasSearchInput) {
                break
            }

            dispatchBackAction()
            delay(400L)
            attempts++
        }
    }

    private fun findDriveSearchBarNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val displayMetrics = context.resources.displayMetrics
        val maxSearchBottom = (displayMetrics.density * 130).toInt()
        return findDriveSearchBarInternal(root, maxSearchBottom)
    }

    private fun findDriveSearchBarInternal(node: AccessibilityNodeInfo, maxBottom: Int): AccessibilityNodeInfo? {
        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        if (bounds.bottom <= maxBottom && bounds.width() > 0) {
            val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
            val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
            val rid = node.viewIdResourceName?.lowercase(Locale.US) ?: ""
            val isSearchBar = text.contains("search in drive") || desc.contains("search in drive") ||
                    text == "search" || desc == "search" ||
                    rid.contains("search_src_text") || rid.contains("search_box") || rid.contains("open_search_bar")
            if (isSearchBar) {
                return if (node.isClickable) {
                    AccessibilityNodeInfo.obtain(node)
                } else {
                    findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node)
                }
            }
        }
        for (index in 0 until node.childCount) {
            val child = node.getChild(index) ?: continue
            val found = findDriveSearchBarInternal(child, maxBottom)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findSearchInputNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val className = node.className?.toString() ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""
        val isEditText = className.contains("EditText", ignoreCase = true) || node.isEditable
        val isSearchField = viewId.contains("search") || viewId.contains("query") || viewId.contains("text")
        if (isEditText || (node.isClickable && isSearchField)) {
            return AccessibilityNodeInfo.obtain(node)
        }
        for (index in 0 until node.childCount) {
            val child = node.getChild(index) ?: continue
            val found = findSearchInputNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findSearchSubmitNode(node: AccessibilityNodeInfo, query: String): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val isSubmit = text.contains("search for") || text.contains("search in drive") ||
                desc.contains("search for") || desc.contains("submit query") ||
                (text.contains(query.lowercase(Locale.US)) && node.isClickable)
        if (isSubmit && (node.isClickable || node.parent?.isClickable == true)) {
            return if (node.isClickable) {
                AccessibilityNodeInfo.obtain(node)
            } else {
                findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node)
            }
        }
        for (index in 0 until node.childCount) {
            val child = node.getChild(index) ?: continue
            val found = findSearchSubmitNode(child, query)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findClearSearchButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""
        val isClear = desc.contains("clear query") || desc.contains("clear search") ||
                viewId.contains("search_close_btn") || viewId.contains("clear") || desc == "clear"
        if (isClear && (node.isClickable || node.parent?.isClickable == true)) {
            return if (node.isClickable) {
                AccessibilityNodeInfo.obtain(node)
            } else {
                findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node)
            }
        }
        for (index in 0 until node.childCount) {
            val child = node.getChild(index) ?: continue
            val found = findClearSearchButton(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun isDriveViewerScreen(root: AccessibilityNodeInfo): Boolean {
        val descList = mutableListOf<String>()
        collectAllDescriptions(root, descList)
        val combined = descList.joinToString(" ").lowercase(Locale.US)
        return combined.contains("close") && (combined.contains("more options") || combined.contains("share")) &&
                !combined.contains("search in drive")
    }

    private fun findViewerMoreOptionsNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        if (desc.contains("more options") || desc.contains("more actions")) {
            return if (node.isClickable) {
                AccessibilityNodeInfo.obtain(node)
            } else {
                findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node)
            }
        }
        for (index in 0 until node.childCount) {
            val child = node.getChild(index) ?: continue
            val found = findViewerMoreOptionsNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun collectAllDescriptions(node: AccessibilityNodeInfo, outList: MutableList<String>) {
        val text = node.text?.toString()?.trim() ?: ""
        if (text.isNotBlank()) outList.add(text)
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        if (desc.isNotBlank()) outList.add(desc)
        for (index in 0 until node.childCount) {
            val child = node.getChild(index) ?: continue
            collectAllDescriptions(child, outList)
            child.recycle()
        }
    }

    private fun performVerifiedAccessibilityClick(node: AccessibilityNodeInfo?): Boolean {
        if (node == null) return false
        if (node.isClickable) {
            val success = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (success) return true
        }
        var current: AccessibilityNodeInfo? = node.parent
        var depth = 0
        while (current != null && depth < MAX_TREE_INSPECTION_DEPTH) {
            if (current.isClickable) {
                val result = current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                current.recycle()
                if (result) return true
            }
            val parentNode = current.parent
            current.recycle()
            current = parentNode
            depth++
        }
        current?.recycle()
        return false
    }

    private fun ensureDriveForeground() {
        try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(DRIVE_PACKAGE_NAME)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            }
            if (launchIntent != null) {
                context.startActivity(launchIntent)
            }
        } catch (e: Exception) {
            CrawlerTraceLogger.log("DRIVE_SEARCH", "Warning: Could not launch Drive foreground intent: ${e.message}")
        }
    }

    private suspend fun waitForDriveForeground(timeoutMs: Long): Boolean {
        return waitForConditionAction(timeoutMs, FOREGROUND_POLL_INTERVAL_MILLISECONDS) {
            val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            val pkg = root.packageName?.toString() ?: ""
            root.recycle()
            pkg.contains(DRIVE_PACKAGE_NAME)
        }
    }

    private suspend fun waitForAttachmentIngestion(attachmentId: String) {
        val startTime = System.currentTimeMillis()
        while (serviceScope.isActive && (System.currentTimeMillis() - startTime) < INGESTION_WAIT_TIMEOUT_MILLISECONDS) {
            val record = database.attachmentDao().getAttachmentById(attachmentId)
            if (record != null && record.localUri.isNotBlank()) {
                return
            }
            delay(300L)
        }
    }
}
