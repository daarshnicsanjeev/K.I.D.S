package com.kids.collector.data.db

import androidx.room.TypeConverter
import com.kids.collector.domain.model.ChannelConfig
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class Converters {

    private val json = Json { ignoreUnknownKeys = true }

    @TypeConverter
    fun fromChannelConfigList(channels: List<ChannelConfig>?): String {
        return if (channels == null) "[]" else json.encodeToString(channels)
    }

    @TypeConverter
    fun toChannelConfigList(jsonString: String?): List<ChannelConfig> {
        return if (jsonString.isNullOrBlank()) emptyList() else {
            try {
                json.decodeFromString(jsonString)
            } catch (_: Exception) {
                emptyList()
            }
        }
    }
}
