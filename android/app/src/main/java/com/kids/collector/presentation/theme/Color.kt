package com.kids.collector.presentation.theme

import androidx.compose.ui.graphics.Color

/**
 * K.I.D.S. Brand Color Palette with WCAG 2.1 Contrast Ratios
 */
val DeepNavy = Color(0xFF1A365D)      // Contrast 11.4:1 (AAA) - Brand primary, headers, primary buttons
val AmberOrange = Color(0xFFED8936)   // Contrast 3.0:1 (UI badges, sync indicators, highlight borders)
val AmberOrangeDark = Color(0xFFC05621) // Contrast 4.6:1 (AA for small text)
val LightSlate = Color(0xFFE2E8F0)    // Structural borders, divider lines, inactive chips
val OffWhiteCanvas = Color(0xFFF7FAFC) // Main application scaffold background
val SurfaceWhite = Color(0xFFFFFFFF)  // Card surfaces, dialogs, elevated containers
val TextPrimary = Color(0xFF0F172A)   // Contrast 15.8:1 (AAA) - High contrast body & titles
val TextSecondary = Color(0xFF475569) // Contrast 5.5:1 (AA) - Timestamps, metadata labels

val SuccessGreen = Color(0xFF2ECC71)  // Sync complete indicator
val ErrorRed = Color(0xFFE53E3E)      // Sync error / drop indicator
val WarningYellow = Color(0xFFECC94B) // Pending sync indicator
