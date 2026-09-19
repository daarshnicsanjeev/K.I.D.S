package com.kids.collector.domain.graph

import com.kids.collector.domain.model.Attachment
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.domain.model.ContentCategory
import com.kids.collector.domain.model.Notice
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.text.SimpleDateFormat
import java.util.*

@Serializable
data class GraphNode(
    val id: String,
    val type: String,
    val label: String,
    val category: String? = null,
    val sourceApp: String? = null,
    val timestampMs: Long? = null,
    val metadata: Map<String, String> = emptyMap()
)

@Serializable
data class GraphEdge(
    val source: String,
    val target: String,
    val relationship: String,
    val weight: Double = 1.0,
    val confidence: String = "EXTRACTED"
)

@Serializable
data class KnowledgeGraph(
    val version: String = "1.0",
    val childId: String,
    val generatedAtMs: Long = System.currentTimeMillis(),
    val nodes: List<GraphNode>,
    val edges: List<GraphEdge>
)

/**
 * Native Kotlin Graphify Engine
 *
 * Runs locally on-device without cloud API dependencies.
 * Synthesizes:
 * 1. _system/knowledge_graph.json (GraphRAG compliant index for Gemini & MCP servers)
 * 2. MASTER_DIGEST.md (Per-child AI-optimized comprehensive Markdown digest)
 * 3. FAMILY_DIGEST.md (Multi-child rollup for parents)
 * 4. graph.html (Self-contained interactive D3.js visual graph)
 */
class KotlinGraphifyEngine {

    private val json = Json { prettyPrint = true; ignoreUnknownKeys = true }
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val timeFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US)

    fun buildGraph(
        child: ChildProfile,
        notices: List<Notice>,
        attachments: List<Attachment> = emptyList()
    ): KnowledgeGraph {
        val nodes = mutableListOf<GraphNode>()
        val edges = mutableListOf<GraphEdge>()

        // 1. Root Node: Child
        val childNodeId = "child_${child.childId}"
        nodes.add(
            GraphNode(
                id = childNodeId,
                type = "Child",
                label = "${child.firstName} (${child.grade}, ${child.schoolName})",
                metadata = mapOf("academicYear" to child.academicYear, "school" to child.schoolName)
            )
        )

        // Index attachments by noticeId
        val attachmentMap = attachments.groupBy { it.noticeId }

        notices.forEach { notice ->
            val nodeType = when (notice.category) {
                ContentCategory.HOMEWORK -> "Assignment"
                ContentCategory.CIRCULAR -> "EmailCircular"
                ContentCategory.ATTENDANCE -> "Attendance"
                ContentCategory.FEES -> "FeeNotice"
                ContentCategory.UNKNOWN -> "PortalNotice"
            }

            val noticeNodeId = "notice_${notice.noticeId}"
            nodes.add(
                GraphNode(
                    id = noticeNodeId,
                    type = nodeType,
                    label = notice.title,
                    category = notice.category.name,
                    sourceApp = notice.sourceApp,
                    timestampMs = notice.timestampMs,
                    metadata = mapOf("sender" to notice.sender, "bodyPreview" to notice.body.take(120))
                )
            )

            // Notice -> Child (BELONGS_TO)
            edges.add(
                GraphEdge(
                    source = noticeNodeId,
                    target = childNodeId,
                    relationship = "BELONGS_TO"
                )
            )

            // Sender entity (Teacher / School Admin)
            if (notice.sender.isNotBlank()) {
                val senderNodeId = "sender_${notice.sender.trim().lowercase().hashCode()}"
                if (nodes.none { it.id == senderNodeId }) {
                    nodes.add(
                        GraphNode(
                            id = senderNodeId,
                            type = "Teacher",
                            label = notice.sender
                        )
                    )
                }
                // Notice -> Teacher (ASSIGNED_BY)
                edges.add(
                    GraphEdge(
                        source = noticeNodeId,
                        target = senderNodeId,
                        relationship = "ASSIGNED_BY"
                    )
                )
            }

            // Linked attachments
            attachmentMap[notice.noticeId]?.forEach { att ->
                val attNodeId = "att_${att.attachmentId}"
                nodes.add(
                    GraphNode(
                        id = attNodeId,
                        type = "Attachment",
                        label = att.fileName,
                        metadata = mapOf(
                            "mimeType" to att.mimeType,
                            "sizeBytes" to att.sizeBytes.toString(),
                            "hasOcr" to (!att.ocrText.isNullOrBlank()).toString()
                        )
                    )
                )

                // Attachment -> Notice (ATTACHED_TO)
                edges.add(
                    GraphEdge(
                        source = attNodeId,
                        target = noticeNodeId,
                        relationship = "ATTACHED_TO"
                    )
                )
            }
        }

        return KnowledgeGraph(
            childId = child.childId,
            nodes = nodes,
            edges = edges
        )
    }

    fun exportToJson(graph: KnowledgeGraph): String {
        return json.encodeToString(graph)
    }

    fun generateMasterDigest(
        child: ChildProfile,
        notices: List<Notice>,
        attachments: List<Attachment> = emptyList()
    ): String {
        val sb = StringBuilder()
        val generatedDate = timeFormat.format(Date())

        sb.appendLine("# K.I.D.S. MASTER DIGEST: ${child.firstName.uppercase()}")
        sb.appendLine("> **Academic Year:** ${child.academicYear} | **School:** ${child.schoolName} | **Grade:** ${child.grade}")
        sb.appendLine("> **Generated:** $generatedDate | **Total Notices:** ${notices.size} | **Attachments:** ${attachments.size}")
        sb.appendLine()

        // Group by category
        val grouped = notices.groupBy { it.category }

        // Section 1: Homework & Assignments
        val homeworkList = grouped[ContentCategory.HOMEWORK].orEmpty()
        sb.appendLine("## 📚 Homework & Assignments (${homeworkList.size})")
        if (homeworkList.isEmpty()) {
            sb.appendLine("*No pending assignments recorded.*")
        } else {
            sb.appendLine("| Date | Subject / Title | Details | Source |")
            sb.appendLine("| :--- | :--- | :--- | :--- |")
            homeworkList.sortedByDescending { it.timestampMs }.forEach { hw ->
                val date = dateFormat.format(Date(hw.timestampMs))
                sb.appendLine("| $date | **${hw.title.replace("|", "-")}** | ${hw.body.replace("\n", " ").take(100)} | `${hw.sourceApp}` |")
            }
        }
        sb.appendLine()

        // Section 2: Circulars & Exam Timetables
        val circulars = grouped[ContentCategory.CIRCULAR].orEmpty()
        sb.appendLine("## 📢 Circulars & Schedules (${circulars.size})")
        if (circulars.isEmpty()) {
            sb.appendLine("*No circulars recorded.*")
        } else {
            sb.appendLine("| Date | Circular Title | Sender | Attachments |")
            sb.appendLine("| :--- | :--- | :--- | :--- |")
            circulars.sortedByDescending { it.timestampMs }.forEach { circ ->
                val date = dateFormat.format(Date(circ.timestampMs))
                val atts = attachments.filter { it.noticeId == circ.noticeId }
                val attLabel = if (atts.isNotEmpty()) atts.joinToString { it.fileName } else "-"
                sb.appendLine("| $date | **${circ.title.replace("|", "-")}** | ${circ.sender} | $attLabel |")
            }
        }
        sb.appendLine()

        // Section 3: Fees & Administrative Reminders
        val fees = grouped[ContentCategory.FEES].orEmpty()
        if (fees.isNotEmpty()) {
            sb.appendLine("## 💳 Fees & Due Dates (${fees.size})")
            sb.appendLine("| Date | Description | Status |")
            sb.appendLine("| :--- | :--- | :--- |")
            fees.sortedByDescending { it.timestampMs }.forEach { f ->
                val date = dateFormat.format(Date(f.timestampMs))
                sb.appendLine("| $date | **${f.title.replace("|", "-")}** | Active Reminder |")
            }
            sb.appendLine()
        }

        // Section 4: OCR Text Excerpts
        val ocrAttachments = attachments.filter { !it.ocrText.isNullOrBlank() }
        if (ocrAttachments.isNotEmpty()) {
            sb.appendLine("## 🔍 Indexed OCR Excerpts from Circular PDFs")
            ocrAttachments.forEach { att ->
                sb.appendLine("### Attachment: `${att.fileName}`")
                sb.appendLine("```text")
                sb.appendLine(att.ocrText?.take(600) ?: "")
                sb.appendLine("```")
                sb.appendLine()
            }
        }

        sb.appendLine("---")
        sb.appendLine("*Processed on-device by K.I.D.S. Android Collector • Model Context Protocol & Gemini Ready*")
        return sb.toString()
    }

    fun generateFamilyDigest(
        childrenWithNotices: List<Pair<ChildProfile, List<Notice>>>
    ): String {
        val sb = StringBuilder()
        sb.appendLine("# K.I.D.S. FAMILY DIGEST")
        sb.appendLine("> Multi-Child Educational Overview • Generated on-device")
        sb.appendLine()

        childrenWithNotices.forEach { (child, notices) ->
            sb.appendLine("### 🧒 ${child.firstName} (${child.grade}, ${child.schoolName})")
            sb.appendLine("- **Active Year:** ${child.academicYear}")
            sb.appendLine("- **Total Communications:** ${notices.size}")
            val latest = notices.maxByOrNull { it.timestampMs }
            if (latest != null) {
                val date = dateFormat.format(Date(latest.timestampMs))
                sb.appendLine("- **Latest Announcement:** \"${latest.title}\" ($date)")
            }
            sb.appendLine()
        }

        return sb.toString()
    }

    fun generateInteractiveHtml(child: ChildProfile, graph: KnowledgeGraph): String {
        val graphJson = exportToJson(graph)
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K.I.D.S. Knowledge Graph - ${child.firstName}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F7FAFC; color: #0F172A; }
        header { background: #1A365D; color: #FFFFFF; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
        h1 { margin: 0; font-size: 18px; font-weight: 600; }
        .badge { background: #ED8936; color: #0F172A; font-weight: bold; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
        #chart { width: 100vw; height: calc(100vh - 64px); }
        .node { stroke: #FFFFFF; stroke-width: 2px; cursor: pointer; }
        .link { stroke: #CBD5E1; stroke-opacity: 0.6; stroke-width: 1.5px; }
        .node text { font-size: 11px; fill: #0F172A; font-weight: 500; pointer-events: none; }
        .tooltip { position: absolute; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); font-size: 12px; pointer-events: none; display: none; }
    </style>
</head>
<body>
    <header>
        <h1>K.I.D.S. Knowledge Graph: ${child.firstName} (${child.grade})</h1>
        <span class="badge">${child.schoolName}</span>
    </header>
    <div id="chart"></div>
    <div id="tooltip" class="tooltip"></div>

    <script>
        const data = $graphJson;
        const width = window.innerWidth;
        const height = window.innerHeight - 64;

        const svg = d3.select("#chart").append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g");

        svg.call(d3.zoom().scaleExtent([0.2, 4]).on("zoom", (event) => g.attr("transform", event.transform)));

        const colorMap = {
            "Child": "#1A365D",
            "Assignment": "#ED8936",
            "EmailCircular": "#3182CE",
            "Attendance": "#E53E3E",
            "FeeNotice": "#805AD5",
            "Teacher": "#38A169",
            "Attachment": "#718096"
        };

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.edges).id(d => d.id).distance(90))
            .force("charge", d3.forceManyBody().strength(-240))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = g.append("g").selectAll(".link")
            .data(data.edges).enter().append("line").attr("class", "link");

        const node = g.append("g").selectAll(".node")
            .data(data.nodes).enter().append("g");

        node.append("circle")
            .attr("r", d => d.type === "Child" ? 18 : (d.type === "Teacher" ? 12 : 9))
            .attr("fill", d => colorMap[d.type] || "#A0AEC0")
            .attr("class", "node");

        node.append("text")
            .attr("dx", 14)
            .attr("dy", ".35em")
            .text(d => d.label.length > 25 ? d.label.slice(0, 22) + "..." : d.label);

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("transform", d => `translate($${"d.x"},$${"d.y"})`);
        });
    </script>
</body>
</html>
        """.trimIndent()
    }
}
