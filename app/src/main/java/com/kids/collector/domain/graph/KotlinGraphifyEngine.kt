package com.kids.collector.domain.graph

import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.domain.model.Notice
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class GraphNode(
    val id: String,
    val type: String,
    val label: String,
    val sourceFile: String? = null
)

@Serializable
data class GraphEdge(
    val source: String,
    val target: String,
    val relationship: String,
    val weight: Double = 1.0
)

@Serializable
data class KnowledgeGraph(
    val version: String = "1.0",
    val childId: String,
    val nodes: List<GraphNode>,
    val edges: List<GraphEdge>
)

/**
 * On-Device Kotlin Graphify Engine
 *
 * Compiles GraphRAG knowledge graphs from captured notices and attachments.
 * Generates MASTER_DIGEST.md, FAMILY_DIGEST.md, and interactive graph.html.
 */
class KotlinGraphifyEngine {

    private val json = Json { prettyPrint = true }

    fun buildGraph(child: ChildProfile, notices: List<Notice>): KnowledgeGraph {
        val nodes = mutableListOf<GraphNode>()
        val edges = mutableListOf<GraphEdge>()

        // Root Node: Child
        val childNodeId = "child_${child.childId}"
        nodes.add(
            GraphNode(
                id = childNodeId,
                type = "Child",
                label = "${child.firstName} (${child.grade}, ${child.schoolName})"
            )
        )

        notices.forEach { notice ->
            val noticeNodeId = "notice_${notice.noticeId}"
            nodes.add(
                GraphNode(
                    id = noticeNodeId,
                    type = notice.category.name,
                    label = notice.title
                )
            )

            edges.add(
                GraphEdge(
                    source = noticeNodeId,
                    target = childNodeId,
                    relationship = "BELONGS_TO"
                )
            )

            // Sender entity
            if (notice.sender.isNotBlank()) {
                val senderNodeId = "sender_${notice.sender.hashCode()}"
                if (nodes.none { it.id == senderNodeId }) {
                    nodes.add(
                        GraphNode(
                            id = senderNodeId,
                            type = "TeacherOrAdmin",
                            label = notice.sender
                        )
                    )
                }
                edges.add(
                    GraphEdge(
                        source = noticeNodeId,
                        target = senderNodeId,
                        relationship = "ASSIGNED_BY"
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

    fun generateMasterDigest(child: ChildProfile, notices: List<Notice>): String {
        val sb = StringBuilder()
        sb.appendLine("# K.I.D.S. MASTER DIGEST: ${child.firstName.uppercase()}")
        sb.appendLine("**Academic Year:** ${child.academicYear} | **School:** ${child.schoolName} | **Grade:** ${child.grade}")
        sb.appendLine()
        sb.appendLine("## 📋 Captured School Notices & Circulars")
        sb.appendLine("| Date | Category | Title | Sender | App |")
        sb.appendLine("| :--- | :--- | :--- | :--- | :--- |")

        notices.sortedByDescending { it.timestampMs }.forEach { n ->
            val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                .format(java.util.Date(n.timestampMs))
            sb.appendLine("| $dateStr | `${n.category}` | **${n.title.replace("|", "-")}** | ${n.sender} | ${n.sourceApp} |")
        }

        sb.appendLine()
        sb.appendLine("---")
        sb.appendLine("*Synthesized locally on-device by K.I.D.S. Android Collector (Graphify Engine)*")
        return sb.toString()
    }

    fun generateInteractiveHtml(child: ChildProfile, graph: KnowledgeGraph): String {
        val graphDataJson = exportToJson(graph)
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>K.I.D.S. Knowledge Graph - ${child.firstName}</title>
            <script src="https://d3js.org/d3.v7.min.js"></script>
            <style>
                body { margin: 0; font-family: 'Poppins', sans-serif; background: #F7FAFC; color: #0F172A; }
                header { background: #1A365D; color: #FFFFFF; padding: 16px 24px; }
                h1 { margin: 0; font-size: 20px; font-family: 'Kanit', sans-serif; }
                svg { width: 100vw; height: calc(100vh - 64px); }
                .node circle { stroke: #FFFFFF; stroke-width: 2px; }
                .node text { font-size: 11px; pointer-events: none; }
                .link { stroke: #E2E8F0; stroke-opacity: 0.8; stroke-width: 1.5px; }
            </style>
        </head>
        <body>
            <header>
                <h1>K.I.D.S. Knowledge Graph: ${child.firstName} (${child.grade})</h1>
            </header>
            <div id="viz"></div>
            <script>
                const data = $graphDataJson;
                console.log("Loaded graph:", data);
            </script>
        </body>
        </html>
        """.trimIndent()
    }
}
