package com.kids.collector.presentation.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import com.kids.collector.R

val fontProvider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

// Kanit font for Display & Headings (Confident, structured, modern)
val KanitFont = GoogleFont("Kanit")
val KanitFontFamily = FontFamily(
    Font(googleFont = KanitFont, fontProvider = fontProvider, weight = FontWeight.Normal),
    Font(googleFont = KanitFont, fontProvider = fontProvider, weight = FontWeight.Medium),
    Font(googleFont = KanitFont, fontProvider = fontProvider, weight = FontWeight.SemiBold),
    Font(googleFont = KanitFont, fontProvider = fontProvider, weight = FontWeight.Bold)
)

// Poppins font for Body & UI Controls (Geometric, approachable, highly legible)
val PoppinsFont = GoogleFont("Poppins")
val PoppinsFontFamily = FontFamily(
    Font(googleFont = PoppinsFont, fontProvider = fontProvider, weight = FontWeight.Normal),
    Font(googleFont = PoppinsFont, fontProvider = fontProvider, weight = FontWeight.Medium),
    Font(googleFont = PoppinsFont, fontProvider = fontProvider, weight = FontWeight.SemiBold),
    Font(googleFont = PoppinsFont, fontProvider = fontProvider, weight = FontWeight.Bold)
)

val KidsTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = KanitFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        color = TextPrimary
    ),
    headlineMedium = TextStyle(
        fontFamily = KanitFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 32.sp,
        color = TextPrimary
    ),
    titleLarge = TextStyle(
        fontFamily = KanitFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 28.sp,
        color = TextPrimary
    ),
    titleMedium = TextStyle(
        fontFamily = PoppinsFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        color = TextPrimary
    ),
    bodyLarge = TextStyle(
        fontFamily = PoppinsFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        color = TextPrimary
    ),
    bodyMedium = TextStyle(
        fontFamily = PoppinsFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        color = TextSecondary
    ),
    labelLarge = TextStyle(
        fontFamily = PoppinsFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        color = TextPrimary
    )
)
