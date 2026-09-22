package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Color
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.text.TextUtils
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Floating Notice Capture Assistant Overlay
 *
 * Uses TYPE_ACCESSIBILITY_OVERLAY (zero extra permissions needed).
 * Provides a minimal, draggable floating pill over Google Classroom with:
 * - Real-time captured notices and physical file download counters
 * - Live Finite State Machine status indicator (Scanning, Reading, Downloading, Returning)
 * - Single-tap "Auto-Capture" with immediate cancellable lifecycle
 * - Draggable anywhere on the screen & minimizable to a compact circle
 */
class FloatingCrawlerOverlay(
    private val service: AccessibilityService,
    private val onStartAutoCapture: () -> Unit,
    private val onStopAutoCapture: () -> Unit
) {

    private val windowManager = service.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val handler = Handler(Looper.getMainLooper())

    private var overlayView: LinearLayout? = null
    private var params: WindowManager.LayoutParams? = null

    private var isAutoScrolling = false
    private var isMinimized = false
    private var capturedCount = 0
    private var capturedAttachmentsCount = 0

    private var counterTextView: TextView? = null
    private var statusTextView: TextView? = null
    private var detailTextView: TextView? = null
    private var autoButton: Button? = null
    private var expandedContent: LinearLayout? = null
    private var minimizedBubble: TextView? = null

    fun show() {
        handler.post {
            if (overlayView != null) {
                overlayView?.visibility = View.VISIBLE
                autoButton?.visibility = View.VISIBLE
                expandedContent?.background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpToPx(16).toFloat()
                    setColor(Color.parseColor("#1A365D")) // DeepNavy
                    setStroke(dpToPx(2), Color.parseColor("#ED8936")) // AmberOrange border
                }
                overlayView?.bringToFront()
                return@post
            }

            try {
                val root = LinearLayout(service).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER_HORIZONTAL
                }

                // Window Layout Params with high visibility and accessibility flags
                val p = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.START
                    x = 40
                    y = 280
                }
                params = p

                // 1. Minimized Bubble View (48dp x 48dp circle)
                minimizedBubble = TextView(service).apply {
                    text = "K"
                    setTextColor(Color.parseColor("#0F172A")) // TextPrimary
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
                    gravity = Gravity.CENTER
                    background = GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.parseColor("#ED8936")) // AmberOrange
                        setStroke(dpToPx(2), Color.parseColor("#1A365D"))
                    }
                    layoutParams = LinearLayout.LayoutParams(dpToPx(48), dpToPx(48))
                    visibility = View.GONE
                    setOnClickListener {
                        expand()
                    }
                }
                root.addView(minimizedBubble)

                // 2. Expanded Container
                val expanded = LinearLayout(service).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10))
                    background = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        cornerRadius = dpToPx(16).toFloat()
                        setColor(Color.parseColor("#1A365D")) // DeepNavy
                        setStroke(dpToPx(2), Color.parseColor("#ED8936")) // AmberOrange border
                    }
                    elevation = dpToPx(8).toFloat()
                }
                expandedContent = expanded

                // Header row (Title + Counter + Minimize + Close)
                val headerRow = LinearLayout(service).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                }

                val titleText = TextView(service).apply {
                    text = "K.I.D.S. Assistant"
                    setTextColor(Color.WHITE)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }

                val counter = TextView(service).apply {
                    text = "0 Notices • 0 Files"
                    setTextColor(Color.parseColor("#ED8936")) // Amber
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 10.5f)
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                    setPadding(dpToPx(6), dpToPx(2), dpToPx(6), dpToPx(2))
                    background = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        cornerRadius = dpToPx(6).toFloat()
                        setColor(Color.parseColor("#0F2341"))
                    }
                }
                counterTextView = counter

                val btnMin = TextView(service).apply {
                    text = " — "
                    setTextColor(Color.parseColor("#CBD5E1"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                    gravity = Gravity.CENTER
                    minWidth = dpToPx(48)
                    minHeight = dpToPx(48)
                    setOnClickListener {
                        minimize()
                    }
                }

                val btnClose = TextView(service).apply {
                    text = " ✕ "
                    setTextColor(Color.parseColor("#CBD5E1"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    gravity = Gravity.CENTER
                    minWidth = dpToPx(48)
                    minHeight = dpToPx(48)
                    setOnClickListener {
                        dismissAndRemove()
                    }
                }

                headerRow.addView(titleText)
                headerRow.addView(counter)
                headerRow.addView(btnMin)
                headerRow.addView(btnClose)
                expanded.addView(headerRow)

                // Status Row (Live FSM State Indicator)
                val statusText = TextView(service).apply {
                    text = "Status: Ready"
                    setTextColor(Color.parseColor("#94A3B8")) // Slate
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = dpToPx(4)
                    }
                }
                statusTextView = statusText
                expanded.addView(statusText)

                // Detail snippet row (Current post or file being processed)
                val detailText = TextView(service).apply {
                    text = ""
                    setTextColor(Color.parseColor("#E2E8F0")) // Light Slate
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
                    maxLines = 1
                    ellipsize = TextUtils.TruncateAt.END
                    visibility = View.GONE
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = dpToPx(2)
                    }
                }
                detailTextView = detailText
                expanded.addView(detailText)

                // Button Row
                val buttonRow = LinearLayout(service).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = dpToPx(8)
                    }
                }

                // Single Clear Action Button
                val btnAuto = Button(service).apply {
                    text = "▶ Start Auto-Capture"
                    setTextColor(Color.parseColor("#0F172A"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    background = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        cornerRadius = dpToPx(8).toFloat()
                        setColor(Color.parseColor("#ED8936")) // Amber Orange
                    }
                    minHeight = dpToPx(48)
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    setPadding(dpToPx(16), dpToPx(6), dpToPx(16), dpToPx(6))
                    setOnClickListener {
                        toggleAutoScroll()
                    }
                }
                autoButton = btnAuto
                buttonRow.addView(btnAuto)

                expanded.addView(buttonRow)
                root.addView(expanded)

                // Drag listener to allow moving anywhere on screen
                setupDragListener(root, p)

                overlayView = root
                try {
                    windowManager.addView(root, p)
                    Log.i(TAG, "FloatingCrawlerOverlay attached successfully with type ${p.type}")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed with primary overlay type ${p.type}, attempting fallback type", e)
                    p.type = if (p.type == WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY) {
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        } else {
                            @Suppress("DEPRECATION")
                            WindowManager.LayoutParams.TYPE_PHONE
                        }
                    } else {
                        WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                    }
                    windowManager.addView(root, p)
                    Log.i(TAG, "FloatingCrawlerOverlay attached with fallback type ${p.type}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to attach FloatingCrawlerOverlay", e)
            }
        }
    }

    fun hide() {
        dismissAndRemove()
    }

    fun dismissAndRemove() {
        handler.post {
            if (isAutoScrolling) {
                stopAutoScroll()
            }
            overlayView?.let { view ->
                try {
                    windowManager.removeViewImmediate(view)
                } catch (e: Exception) {
                    try {
                        windowManager.removeView(view)
                    } catch (e2: Exception) {
                        Log.w(TAG, "Error removing overlay view: ${e2.message}")
                    }
                }
            }
            overlayView = null
            isMinimized = false
        }
    }

    fun isShowing(): Boolean = overlayView != null && overlayView?.visibility == View.VISIBLE

    fun isAutoScrollingActive(): Boolean = isAutoScrolling

    fun getCapturedCount(): Int = capturedCount

    fun getCapturedAttachmentsCount(): Int = capturedAttachmentsCount

    fun showCompletion(countNotices: Int, countFiles: Int, onDismissed: () -> Unit = {}) {
        handler.post {
            isAutoScrolling = false
            statusTextView?.text = "✓ Backfill Complete!"
            statusTextView?.setTextColor(Color.parseColor("#86EFAC")) // Light Green
            detailTextView?.visibility = View.VISIBLE
            detailTextView?.text = "$countNotices Notices • $countFiles Files Saved"
            detailTextView?.setTextColor(Color.WHITE)
            expandedContent?.background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(16).toFloat()
                setColor(Color.parseColor("#1B4D3E")) // Deep Success Green
                setStroke(dpToPx(2), Color.parseColor("#4ADE80")) // Bright Green border
            }
            autoButton?.visibility = View.GONE

            // Automatically dismiss and remove overlay after 2.5 seconds with zero clicks needed
            handler.postDelayed({
                dismissAndRemove()
                onDismissed()
            }, 2500)
        }
    }

    fun updateStatus(status: String, detail: String? = null) {
        handler.post {
            statusTextView?.text = status
            if (!detail.isNullOrBlank()) {
                detailTextView?.text = detail
                detailTextView?.visibility = View.VISIBLE
            } else {
                detailTextView?.visibility = View.GONE
            }
        }
    }

    fun incrementNoticeCount() {
        capturedCount++
        updateCountDisplay()
    }

    fun incrementAttachmentCount() {
        capturedAttachmentsCount++
        updateCountDisplay()
    }

    fun resetCounts() {
        capturedCount = 0
        capturedAttachmentsCount = 0
        updateCountDisplay()
    }

    private fun updateCountDisplay() {
        handler.post {
            counterTextView?.text = "$capturedCount Notices • $capturedAttachmentsCount Files"
        }
    }

    fun destroy() {
        dismissAndRemove()
    }

    private fun toggleAutoScroll() {
        if (isAutoScrolling) {
            stopAutoScroll()
        } else {
            startAutoScroll()
        }
    }

    fun startAutoScroll() {
        if (isAutoScrolling) return
        isAutoScrolling = true
        CrawlerTraceLogger.log("SCROLLER_UI", "User started Auto-Capture")
        autoButton?.text = "⏹ Stop Capture"
        autoButton?.setTextColor(Color.WHITE)
        autoButton?.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(8).toFloat()
            setColor(Color.parseColor("#E53E3E")) // Red for clear stop state
        }
        updateStatus("Status: Scanning Stream...")
        onStartAutoCapture()
    }

    fun stopAutoScroll() {
        if (!isAutoScrolling) return
        isAutoScrolling = false
        CrawlerTraceLogger.log("SCROLLER_UI", "User stopped Auto-Capture. Halting crawler and triggering Drive sync.")
        autoButton?.text = "▶ Start Auto-Capture"
        autoButton?.setTextColor(Color.parseColor("#0F172A"))
        autoButton?.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(8).toFloat()
            setColor(Color.parseColor("#ED8936")) // Amber
        }
        updateStatus("Status: Capture Stopped")
        onStopAutoCapture()
        // Trigger a single background sync cycle to Google Drive now that capture finished
        KidsAccessibilityService.triggerDriveSync(service.applicationContext)
    }

    private fun minimize() {
        isMinimized = true
        expandedContent?.visibility = View.GONE
        minimizedBubble?.visibility = View.VISIBLE
    }

    private fun expand() {
        isMinimized = false
        minimizedBubble?.visibility = View.GONE
        expandedContent?.visibility = View.VISIBLE
    }

    fun performScroll(onComplete: () -> Unit) {
        handler.post {
            performScrollGesture(onComplete)
        }
    }

    private fun performScrollGesture(onComplete: () -> Unit) {
        // 1. Primary: Native ACTION_SCROLL_FORWARD on the primary scrollable list container
        try {
            val rootNode = service.rootInActiveWindow
            if (rootNode != null) {
                val scrollableNode = findPrimaryScrollableNode(rootNode)
                if (scrollableNode != null) {
                    val scrolled = scrollableNode.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
                    scrollableNode.recycle()
                    if (scrolled) {
                        CrawlerTraceLogger.log("SCROLLER_ACTION", "Native ACTION_SCROLL_FORWARD succeeded on list container")
                        onComplete()
                        return
                    }
                }
            }
        } catch (e: Exception) {
            CrawlerTraceLogger.log("SCROLLER_ACTION_ERROR", "Error attempting native scroll: ${e.message}")
        }

        // 2. Fallback: Touch swipe offset to the right side (75% width) away from floating overlay
        val displayMetrics = service.resources.displayMetrics
        val width = displayMetrics.widthPixels
        val height = displayMetrics.heightPixels

        val startX = width * 0.75f
        val startY = height * 0.70f
        val endY = height * 0.25f

        CrawlerTraceLogger.log(
            "SCROLLER_SWIPE",
            "Dispatching swipe fallback: ($startX, $startY) -> ($startX, $endY), screen=${width}x${height}, density=${displayMetrics.density}"
        )

        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(startX, endY)
        }

        // Calibrated 450ms swipe
        val stroke = GestureDescription.StrokeDescription(path, 0, 450)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()

        val dispatched = service.dispatchGesture(gesture, object : AccessibilityService.GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                CrawlerTraceLogger.log("SCROLLER_SWIPE_RESULT", "Swipe gesture COMPLETED")
                onComplete()
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                CrawlerTraceLogger.log("SCROLLER_SWIPE_RESULT", "Swipe gesture CANCELLED")
                onComplete()
            }
        }, null)

        if (!dispatched) {
            CrawlerTraceLogger.log("SCROLLER_SWIPE_RESULT", "Failed to dispatch gesture (service or window not ready)")
            onComplete()
        }
    }

    private fun findPrimaryScrollableNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (node.isScrollable) {
            return AccessibilityNodeInfo.obtain(node)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findPrimaryScrollableNode(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private fun setupDragListener(view: View, p: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isClick = false

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = p.x
                    initialY = p.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isClick = true
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        isClick = false
                    }
                    p.x = initialX + dx
                    p.y = initialY + dy
                    try {
                        windowManager.updateViewLayout(view, p)
                    } catch (e: Exception) {
                        // ignore layout updates during destroy
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (isClick && isMinimized) {
                        expand()
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun dpToPx(dp: Int): Int {
        val metrics = service.resources.displayMetrics
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp.toFloat(), metrics).toInt()
    }

    companion object {
        private const val TAG = "FloatingCrawlerOverlay"
    }
}
