package com.kids.collector.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = DeepNavy,
    onPrimary = SurfaceWhite,
    secondary = AmberOrange,
    onSecondary = TextPrimary,
    tertiary = AmberOrangeDark,
    background = OffWhiteCanvas,
    onBackground = TextPrimary,
    surface = SurfaceWhite,
    onSurface = TextPrimary,
    outline = LightSlate
)

@Composable
fun KidsTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = KidsTypography,
        content = content
    )
}
