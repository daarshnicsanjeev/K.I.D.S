package com.kids.collector.presentation.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.presentation.theme.*

@Composable
fun ChildrenGridDashboard(
    children: List<ChildProfile>,
    onAddChildClick: () -> Unit,
    onOpenDiagnosticsClick: () -> Unit,
    onSearchClick: () -> Unit,
    onSelectChild: (ChildProfile) -> Unit
) {
    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DeepNavy)
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "K.I.D.S. Vault Dashboard",
                            style = MaterialTheme.typography.headlineMedium,
                            color = SurfaceWhite,
                            modifier = Modifier.semantics { heading() }
                        )
                        Text(
                            text = "Zero-Backend • AI-Native (drive.file)",
                            style = MaterialTheme.typography.bodySmall,
                            color = AmberOrange
                        )
                    }
                    Button(
                        onClick = onOpenDiagnosticsClick,
                        colors = ButtonDefaults.buttonColors(containerColor = AmberOrangeDark),
                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                    ) {
                        Text("Probe Health", color = SurfaceWhite)
                    }
                }
            }
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAddChildClick,
                containerColor = AmberOrange,
                contentColor = TextPrimary,
                modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
            ) {
                Text("+ Add Another Child", style = MaterialTheme.typography.titleMedium)
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            // Quick Search Button
            OutlinedCard(
                onClick = onSearchClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = 48.dp),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.outlinedCardColors(containerColor = SurfaceWhite)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🔍 Search notices, circulars, homework (FTS)...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Configured Children (${children.size})",
                style = MaterialTheme.typography.titleMedium,
                color = DeepNavy,
                modifier = Modifier.semantics { heading() }
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (children.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No children profiles configured yet.", style = MaterialTheme.typography.titleMedium)
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = onAddChildClick,
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy),
                            modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text("Add First Child", color = SurfaceWhite)
                        }
                    }
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 300.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(children) { child ->
                        ChildCard(child = child, onClick = { onSelectChild(child) })
                    }
                }
            }
        }
    }
}

@Composable
fun ChildCard(
    child: ChildProfile,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .semantics {
                contentDescription = "Child profile for ${child.firstName}, ${child.grade}, ${child.schoolName}"
            },
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(DeepNavy),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = child.firstName.take(2).uppercase(),
                        color = SurfaceWhite,
                        style = MaterialTheme.typography.titleMedium
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = child.firstName,
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary
                    )
                    Text(
                        text = "${child.grade} • ${child.schoolName}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
                Badge(containerColor = SuccessGreen, contentColor = SurfaceWhite) {
                    Text("Sync: OK")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = LightSlate, thickness = 1.dp)
            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Active Ingestion Channels:",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary
            )
            Spacer(modifier = Modifier.height(6.dp))

            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                child.channels.filter { it.isEnabled }.forEach { ch ->
                    AssistChip(
                        onClick = {},
                        label = { Text(ch.channelType.name.replace("_", " ")) },
                        modifier = Modifier.defaultMinSize(minHeight = 36.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Drive Vault: K.I.D.S. Data/${child.academicYear}/${child.firstName}/",
                style = MaterialTheme.typography.bodySmall,
                color = AmberOrangeDark
            )
        }
    }
}
