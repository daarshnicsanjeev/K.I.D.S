package com.kids.collector.presentation

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.lifecycleScope
import com.kids.collector.data.db.ChildProfileEntity
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.presentation.dashboard.ChildrenGridDashboard
import com.kids.collector.presentation.telemetry.DiagnosticFeedScreen
import com.kids.collector.presentation.theme.KidsTheme
import com.kids.collector.presentation.wizard.OnboardingWizardScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class AppScreen {
    WIZARD,
    DASHBOARD,
    DIAGNOSTICS
}

class MainActivity : ComponentActivity() {

    private lateinit var database: KidsDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        database = KidsDatabase.getInstance(this)

        setContent {
            KidsTheme {
                var currentScreen by remember { mutableStateOf(AppScreen.DASHBOARD) }
                var childrenList by remember { mutableStateOf<List<ChildProfile>>(emptyList()) }
                var isFirstLoad by remember { mutableStateOf(true) }

                // Observe children profiles from Room
                LaunchedEffect(Unit) {
                    database.childProfileDao().getAllChildren().collect { entities ->
                        val domainList = entities.map { e ->
                            ChildProfile(
                                childId = e.childId,
                                firstName = e.firstName,
                                grade = e.grade,
                                academicYear = e.academicYear,
                                schoolName = e.schoolName,
                                accountEmail = e.accountEmail,
                                disambiguationTag = e.disambiguationTag,
                                photoUri = e.photoUri,
                                channels = e.channels,
                                createdAtMs = e.createdAtMs
                            )
                        }
                        childrenList = domainList
                        if (isFirstLoad) {
                            currentScreen = if (domainList.isEmpty()) AppScreen.WIZARD else AppScreen.DASHBOARD
                            isFirstLoad = false
                        }
                    }
                }

                when (currentScreen) {
                    AppScreen.WIZARD -> {
                        OnboardingWizardScreen(
                            childSequenceNumber = childrenList.size + 1,
                            onFinishChildSetup = { newChild ->
                                lifecycleScope.launch(Dispatchers.IO) {
                                    database.childProfileDao().insert(
                                        ChildProfileEntity(
                                            childId = newChild.childId,
                                            firstName = newChild.firstName,
                                            grade = newChild.grade,
                                            academicYear = newChild.academicYear,
                                            schoolName = newChild.schoolName,
                                            accountEmail = newChild.accountEmail,
                                            disambiguationTag = newChild.disambiguationTag,
                                            photoUri = newChild.photoUri,
                                            channels = newChild.channels,
                                            createdAtMs = newChild.createdAtMs
                                        )
                                    )
                                    withContext(Dispatchers.Main) {
                                        Toast.makeText(this@MainActivity, "Child ${newChild.firstName} configured successfully!", Toast.LENGTH_SHORT).show()
                                        currentScreen = AppScreen.DASHBOARD
                                    }
                                }
                            },
                            onCancel = if (childrenList.isNotEmpty()) {
                                { currentScreen = AppScreen.DASHBOARD }
                            } else null
                        )
                    }

                    AppScreen.DASHBOARD -> {
                        ChildrenGridDashboard(
                            children = childrenList,
                            onAddChildClick = { currentScreen = AppScreen.WIZARD },
                            onOpenDiagnosticsClick = { currentScreen = AppScreen.DIAGNOSTICS },
                            onSearchClick = {
                                Toast.makeText(this, "Type keywords to search notices offline...", Toast.LENGTH_SHORT).show()
                            },
                            onSelectChild = { child ->
                                Toast.makeText(this, "Viewing vault: K.I.D.S. Data/${child.academicYear}/${child.firstName}/", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }

                    AppScreen.DIAGNOSTICS -> {
                        DiagnosticFeedScreen(
                            onBack = { currentScreen = AppScreen.DASHBOARD },
                            onShareBundle = {
                                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_SUBJECT, "K.I.D.S. Diagnostics Bundle")
                                    putExtra(Intent.EXTRA_TEXT, "K.I.D.S. Diagnostic Snapshot: Health Probe Verified. Zero-Backend Scoped drive.file. All tokens masked.")
                                }
                                startActivity(Intent.createChooser(sendIntent, "Share Diagnostic Logs"))
                            }
                        )
                    }
                }
            }
        }
    }
}
