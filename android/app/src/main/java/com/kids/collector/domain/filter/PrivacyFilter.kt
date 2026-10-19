package com.kids.collector.domain.filter

/**
 * Privacy & Whitelist Filter (Critical Safety Gate)
 *
 * Ensures that non-educational notifications, personal chats, OTPs, and banking alerts
 * are dropped immediately at the memory boundary with ZERO disk writes and ZERO logging.
 */
class PrivacyFilter(
    private val whitelistedPackages: Set<String> = DEFAULT_WHITELIST_PACKAGES,
    private val whitelistedChatGroups: Set<String> = emptySet()
) {

    /**
     * Determines whether a push notification or message is eligible for ingestion.
     *
     * @param packageName The Android package name of the broadcasting app.
     * @param conversationTitle The group or conversation title (e.g. WhatsApp group name).
     * @param text Content of the notice/message for anti-pattern detection (OTPs, banking).
     * @return true if safe to process, false to drop immediately.
     */
    fun shouldIngest(
        packageName: String,
        conversationTitle: String? = null,
        text: String = ""
    ): Boolean {
        // 1. Verify app package is whitelisted
        if (!whitelistedPackages.contains(packageName)) {
            return false
        }

        // 2. Reject sensitive keywords (OTPs, bank transactions, passwords)
        val lowerText = text.lowercase()
        if (BLOCKED_KEYWORDS.any { lowerText.contains(it) }) {
            return false
        }

        // 3. For messaging apps (WhatsApp), verify group is in the explicit parent whitelist
        if (isMessagingApp(packageName)) {
            if (conversationTitle == null) return false
            val normalizedTitle = conversationTitle.trim().lowercase()
            val matched = whitelistedChatGroups.any { it.trim().lowercase() == normalizedTitle }
            if (!matched) return false
        }

        return true
    }

    private fun isMessagingApp(packageName: String): Boolean {
        return packageName == "com.whatsapp" || packageName == "com.whatsapp.w4b"
    }

    companion object {
        val DEFAULT_WHITELIST_PACKAGES = setOf(
            "com.google.android.apps.classroom", // Google Classroom
            "com.whatsapp",                      // WhatsApp (subject to group whitelist)
            "com.whatsapp.w4b",                  // WhatsApp Business
            "com.entab.campuscare",              // CampusCare / Entab ERP
            "com.toddleapp.family",              // Toddle Family Portal
            "com.edunext.parent",                // Edunext Portal
            "com.google.android.gm"              // Gmail (subject to school domain filter)
        )

        val BLOCKED_KEYWORDS = setOf(
            "otp",
            "one time password",
            "bank",
            "debited",
            "credited",
            "verification code",
            "upi pin",
            "atm card"
        )
    }
}
