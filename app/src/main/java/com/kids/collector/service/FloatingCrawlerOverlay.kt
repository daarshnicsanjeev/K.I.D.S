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
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Floating Notice Capture Assistant Overlay
 *
 * Uses TYPE_ACCESSIBILITY_OVERLAY (zero extra permissions needed).
 * Provides a minimal, draggable floating pill over Google Classroom with:
 * - Real-time captured notices counter
 * - Single-tap "Auto-Capture" that scrolls at the optimal calibrated pace (~1.3s)
 * - "Grab Screen" for manual on-demand snapshot
 * - Draggable anywhere on the screen & minimizable to a compact circle
 */
class FloatingCrawlerOverlay(
    private val service: AccessibilityService,
    private val onManualCaptureRequested: () -> Unit
) {

    private val windowManager = service.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val handler = Handler(Looper.getMainLooper())

    private var overlayView: LinearLayout? = null
    private var params: WindowManager.LayoutParams? = null

    private var isAutoScrolling = false
    private var isMinimized = false
    private var capturedCount = 0

    private var counterTextView: TextView? = null
    private var autoButton: Button? = null
    private var expandedContent: LinearLayout? = null
    private var minimizedBubble: TextView? = null

    private val autoScrollRunnable = object : Runnable {
        override fun run() {
            if (!isAutoScrolling) return

            performScrollGesture {
                // After scroll completes, wait 850ms for views to settle and nodes to bind
                if (isAutoScrolling) {
                    onManualCaptureRequested()
                    handler.postDelayed(this, 850)
                }
            }
        }
    }

    fun show() {
        if (overlayView != null) {
            overlayView?.visibility = View.VISIBLE
            return
        }

        try {
            val root = LinearLayout(service).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
            }

            // Window Layout Params
            val p = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 40
                y = 180
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

            // Header row (Title + Counter + Minimize)
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
                text = "0 Captured"
                setTextColor(Color.parseColor("#ED8936")) // Amber
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
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
                setPadding(dpToPx(8), 0, 0, 0)
                setOnClickListener {
                    minimize()
                }
            }

            headerRow.addView(titleText)
            headerRow.addView(counter)
            headerRow.addView(btnMin)
            expanded.addView(headerRow)

            // Button Row
            val buttonRow = LinearLayout(service).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dpToPx(8)
                }
            }

            // Auto-Capture Button
            val btnAuto = Button(service).apply {
                text = "▶ Auto-Capture"
                setTextColor(Color.parseColor("#0F172A"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpToPx(8).toFloat()
                    setColor(Color.parseColor("#ED8936")) // Amber
                }
                minHeight = dpToPx(40)
                setPadding(dpToPx(10), dpToPx(4), dpToPx(10), dpToPx(4))
                setOnClickListener {
                    toggleAutoScroll()
                }
            }
            autoButton = btnAuto
            buttonRow.addView(btnAuto)

            // Manual Grab Screen Button
            val btnGrab = Button(service).apply {
                text = "📸 Grab"
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                background = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpToPx(8).toFloat()
                    setColor(Color.parseColor("#2B4C7E"))
                }
                minHeight = dpToPx(40)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginStart = dpToPx(8)
                }
                setPadding(dpToPx(10), dpToPx(4), dpToPx(10), dpToPx(4))
                setOnClickListener {
                    onManualCaptureRequested()
                }
            }
            buttonRow.addView(btnGrab)

            expanded.addView(buttonRow)
            root.addView(expanded)

            // Drag listener to allow moving anywhere on screen
            setupDragListener(root, p)

            overlayView = root
            windowManager.addView(root, p)
            Log.i(TAG, "FloatingCrawlerOverlay attached successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach FloatingCrawlerOverlay", e)
        }
    }

    fun hide() {
        stopAutoScroll()
        overlayView?.visibility = View.GONE
    }

    fun incrementNoticeCount() {
        capturedCount++
        handler.post {
            counterTextView?.text = "$capturedCount Captured"
        }
    }

    fun destroy() {
        stopAutoScroll()
        overlayView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                Log.w(TAG, "Error removing overlay", e)
            }
        }
        overlayView = null
    }

    private fun toggleAutoScroll() {
        if (isAutoScrolling) {
            stopAutoScroll()
        } else {
            startAutoScroll()
        }
    }

    private fun startAutoScroll() {
        isAutoScrolling = true
        autoButton?.text = "⏸ Pause"
        autoButton?.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(8).toFloat()
            setColor(Color.parseColor("#E2E8F0")) // Slate light
        }
        // Grab current screen first, then start loop
        onManualCaptureRequested()
        handler.postDelayed(autoScrollRunnable, 600)
    }

    private fun stopAutoScroll() {
        isAutoScrolling = false
        handler.removeCallbacks(autoScrollRunnable)
        autoButton?.text = "▶ Auto-Capture"
        autoButton?.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(8).toFloat()
            setColor(Color.parseColor("#ED8936")) // Amber
        }
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

    private fun performScrollGesture(onComplete: () -> Unit) {
        val displayMetrics = service.resources.displayMetrics
        val width = displayMetrics.widthPixels
        val height = displayMetrics.heightPixels

        val startX = width / 2f
        val startY = height * 0.72f
        val endY = height * 0.28f

        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(startX, endY)
        }

        // Calibrated 450ms swipe for smooth RecyclerView scroll
        val stroke = GestureDescription.StrokeDescription(path, 0, 450)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()

        service.dispatchGesture(gesture, object : AccessibilityService.GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                onComplete()
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                onComplete()
            }
        }, null)
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
