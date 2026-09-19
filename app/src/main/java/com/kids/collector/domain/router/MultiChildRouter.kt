package com.kids.collector.domain.router

import com.kids.collector.domain.model.ChildProfile

/**
 * Multi-Child Disambiguation Router
 *
 * Directs notices to the correct child's vault based on priority rules:
 * 1. Explicit Group / Channel Whitelist mapping
 * 2. Child Name match in title or body
 * 3. Student Account Email match
 * 4. Grade / Section Tag match (e.g. "8B" or "STD- VIII" vs "3B")
 */
class MultiChildRouter(
    private val children: List<ChildProfile>
) {

    fun route(
        senderOrGroup: String,
        title: String,
        body: String,
        accountEmail: String? = null
    ): ChildProfile? {
        if (children.isEmpty()) return null
        if (children.size == 1) return children.first()

        val text = "$senderOrGroup $title $body".lowercase()

        // Rule 1: Match by student account email (exact routing)
        if (!accountEmail.isNullOrBlank()) {
            val matched = children.firstOrNull {
                it.accountEmail?.equals(accountEmail.trim(), ignoreCase = true) == true
            }
            if (matched != null) return matched
        }

        // Rule 2: Match by first name mentioned
        for (child in children) {
            if (text.contains(child.firstName.lowercase())) {
                return child
            }
        }

        // Rule 3: Match by grade / section tag
        for (child in children) {
            val tag = child.disambiguationTag?.lowercase()
            if (!tag.isNullOrBlank() && text.contains(tag)) {
                return child
            }
            val grade = child.grade.lowercase()
            if (grade.isNotBlank() && text.contains(grade)) {
                return child
            }
        }

        // Fallback to first configured child if ambiguous
        return children.firstOrNull()
    }
}
