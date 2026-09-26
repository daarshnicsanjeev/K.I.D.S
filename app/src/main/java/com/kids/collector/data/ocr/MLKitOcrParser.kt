package com.kids.collector.data.ocr

import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class OcrExtractionResult(
    val fullText: String,
    val pageCount: Int,
    val wordCount: Int,
    val processingTimeMs: Long
)

/**
 * On-Device Google ML Kit OCR Engine with Streaming PdfRenderer
 *
 * Runs 100% offline text recognition on circular images and multi-page PDFs in ~150-300ms per page.
 * Strictly recycles in-memory Bitmaps per page to prevent Out-Of-Memory (OOM) exceptions.
 * Incurs $0.00 cloud API cost.
 */
class MLKitOcrParser(private val context: Context) {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    suspend fun extractTextFromImageUri(uri: Uri): OcrExtractionResult = withContext(Dispatchers.Default) {
        val startTime = System.currentTimeMillis()
        val text = suspendCancellableCoroutine { continuation ->
            try {
                val image = InputImage.fromFilePath(context, uri)
                recognizer.process(image)
                    .addOnSuccessListener { visionText ->
                        continuation.resume(visionText.text)
                    }
                    .addOnFailureListener { exception ->
                        continuation.resumeWithException(exception)
                    }
            } catch (e: Exception) {
                continuation.resumeWithException(e)
            }
        }
        val duration = System.currentTimeMillis() - startTime
        val wordCount = text.split(Regex("\\s+")).filter { it.isNotBlank() }.size
        OcrExtractionResult(text, 1, wordCount, duration)
    }

    suspend fun extractTextFromBitmap(bitmap: Bitmap): String = withContext(Dispatchers.Default) {
        suspendCancellableCoroutine { continuation ->
            try {
                val image = InputImage.fromBitmap(bitmap, 0)
                recognizer.process(image)
                    .addOnSuccessListener { visionText ->
                        continuation.resume(visionText.text)
                    }
                    .addOnFailureListener { exception ->
                        continuation.resumeWithException(exception)
                    }
            } catch (e: Exception) {
                continuation.resumeWithException(e)
            }
        }
    }

    /**
     * Streams multi-page circular PDFs page-by-page using native Android PdfRenderer.
     * Pages are rendered sequentially to bitmap, processed through ML Kit OCR, and immediately recycled.
     */
    suspend fun extractTextFromPdfFile(pdfFile: File): OcrExtractionResult = withContext(Dispatchers.Default) {
        val startTime = System.currentTimeMillis()
        val sb = StringBuilder()
        var pageCount = 0

        var pfd: ParcelFileDescriptor? = null
        var renderer: PdfRenderer? = null

        try {
            pfd = ParcelFileDescriptor.open(pdfFile, ParcelFileDescriptor.MODE_READ_ONLY)
            renderer = PdfRenderer(pfd)
            pageCount = renderer.pageCount

            for (i in 0 until pageCount) {
                val page = renderer.openPage(i)
                try {
                    // Render at readable standard DPI (~150-200 DPI scale)
                    val width = page.width * 2
                    val height = page.height * 2
                    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    try {
                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        val pageText = extractTextFromBitmap(bitmap)
                        if (pageText.isNotBlank()) {
                            sb.appendLine("[--- Page ${i + 1} of $pageCount ---]")
                            sb.appendLine(pageText)
                            sb.appendLine()
                        }
                    } finally {
                        bitmap.recycle() // Critical: Immediately free bitmap memory
                    }
                } finally {
                    page.close()
                }
            }
        } catch (e: Exception) {
            Log.e("MLKitOcrParser", "Failed rendering PDF pages for OCR: ${pdfFile.name}", e)
            throw e
        } finally {
            renderer?.close()
            pfd?.close()
        }

        val fullText = sb.toString().trim()
        val duration = System.currentTimeMillis() - startTime
        val wordCount = fullText.split(Regex("\\s+")).filter { it.isNotBlank() }.size

        OcrExtractionResult(fullText, pageCount, wordCount, duration)
    }
}
