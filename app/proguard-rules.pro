# K.I.D.S. Proguard Rules

# Google ML Kit
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# Google API Client & Drive/Sheets
-keep class com.google.api.services.drive.** { *; }
-keep class com.google.api.services.sheets.** { *; }
-keep class com.google.api.client.** { *; }
-dontwarn com.google.api.client.**

# Room Database
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# Kotlinx Serialization
-keepattributes *Annotation*,InnerClasses
-dontnote kotlinx.serialization.SerializationKt
-keepclassmembers class * {
    *** Companion;
}
-keepclasseswithmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}

# Coroutines & WorkManager
-keep class androidx.work.** { *; }
