package com.kids.collector.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.kids.collector.presentation.telemetry.DiagnosticFeedScreen
import com.kids.collector.presentation.theme.KidsTheme
import com.kids.collector.presentation.wizard.OnboardingWizardScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            KidsTheme {
                var isSetupComplete by remember { mutableStateOf(false) }

                if (!isSetupComplete) {
                    OnboardingWizardScreen(
                        onCompleteSetup = { isSetupComplete = true }
                    )
                } else {
                    DiagnosticFeedScreen(
                        onRunHealthProbe = {
                            // Run 5-point health check
                        }
                    )
                }
            }
        }
    }
}
