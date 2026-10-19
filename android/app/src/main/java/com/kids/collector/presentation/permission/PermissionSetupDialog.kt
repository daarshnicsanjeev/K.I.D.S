package com.kids.collector.presentation.permission

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.kids.collector.presentation.theme.*

/**
 * Automatic System Permission Setup Modal
 *
 * Automatically pops up when required background capture or backfill permissions are missing.
 * Dynamically re-checks permissions on ON_RESUME so that returning from phone Settings
 * instantly updates the status badges to green.
 */
@Composable
fun PermissionSetupDialog(
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasNotificationAccess by remember {
        mutableStateOf(PermissionHelper.isNotificationAccessGranted(context))
    }
    var hasAccessibility by remember {
        mutableStateOf(PermissionHelper.isAccessibilityGranted(context))
    }

    // Refresh status every time user returns from phone Settings
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                hasNotificationAccess = PermissionHelper.isNotificationAccessGranted(context)
                hasAccessibility = PermissionHelper.isAccessibilityGranted(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Surface(
                        color = AmberOrange.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "🛡️",
                            modifier = Modifier.padding(6.dp),
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                    Column {
                        Text(
                            text = "Required Permissions",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = DeepNavy
                        )
                        Text(
                            text = "K.I.D.S. operates 100% locally with zero cloud backend.",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                }

                HorizontalDivider(color = LightSlate)

                // 1. Notification Access Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            width = 1.dp,
                            color = if (hasNotificationAccess) SuccessGreen else AmberOrange,
                            shape = RoundedCornerShape(12.dp)
                        ),
                    colors = CardDefaults.cardColors(
                        containerColor = if (hasNotificationAccess) SuccessGreen.copy(alpha = 0.06f) else OffWhiteCanvas
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "1. Notification Access",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy
                            )
                            Surface(
                                color = if (hasNotificationAccess) SuccessGreen else AmberOrange,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = if (hasNotificationAccess) "✓ ACTIVE" else "REQUIRED",
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Text(
                            text = "Enables 24/7 background capture of homework, circulars & fee notices from Classroom, WhatsApp & ERPs.",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )

                        if (!hasNotificationAccess) {
                            Button(
                                onClick = {
                                    Toast.makeText(context, "Find 'K.I.D.S.' in the list and toggle ON", Toast.LENGTH_LONG).show()
                                    PermissionHelper.openNotificationListenerSettings(context)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 44.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DeepNavy),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Enable Notification Access \u2192")
                            }
                        }
                    }
                }

                // 2. Accessibility Backfill Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            width = 1.dp,
                            color = if (hasAccessibility) SuccessGreen else LightSlate,
                            shape = RoundedCornerShape(12.dp)
                        ),
                    colors = CardDefaults.cardColors(
                        containerColor = if (hasAccessibility) SuccessGreen.copy(alpha = 0.06f) else OffWhiteCanvas
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "2. Backfill Assistant",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy
                            )
                            Surface(
                                color = if (hasAccessibility) SuccessGreen else TextSecondary,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = if (hasAccessibility) "✓ ACTIVE" else "OPTIONAL",
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Text(
                            text = "Powers the floating overlay to auto-capture past assignments from Classroom without school passwords.",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )

                        if (!hasAccessibility) {
                            OutlinedButton(
                                onClick = {
                                    Toast.makeText(context, "Under Downloaded Apps, turn on 'K.I.D.S.'", Toast.LENGTH_LONG).show()
                                    PermissionHelper.openAccessibilitySettings(context)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 44.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Enable Backfill Assistant \u2192")
                            }
                        }
                    }
                }

                // Restricted Settings Helper Card (Android 13/14/15)
                if (!hasNotificationAccess || !hasAccessibility) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = OffWhiteCanvas),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, LightSlate)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "💡 Getting \"Restricted setting\" error?",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy
                            )
                            Text(
                                text = "Android restricts sideloaded APKs by default. To unlock:\n1. Tap 'Unlock in App Settings' below\n2. Tap the 3 dots (⋮) in top-right corner\n3. Tap 'Allow restricted settings'",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                            OutlinedButton(
                                onClick = {
                                    Toast.makeText(context, "Tap 3 dots (⋮) in top-right -> 'Allow restricted settings'", Toast.LENGTH_LONG).show()
                                    PermissionHelper.openAppDetailsSettings(context)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 40.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Unlock in App Settings (3 Dots ⋮)", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }

                // Continue / Done Button
                Button(
                    onClick = onDismiss,
                    modifier = Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = 48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (hasNotificationAccess) DeepNavy else AmberOrange
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text(
                        text = if (hasNotificationAccess) "Continue to App" else "Proceed Anyway",
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
