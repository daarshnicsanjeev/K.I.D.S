package com.kids.collector

import android.content.Context
import com.google.common.truth.Truth.assertThat
import com.kids.collector.data.drive.DriveVaultManager
import com.kids.collector.data.drive.ProvisionStep1Result
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test

class DriveVaultManagerTest {

    @Test
    fun `provisionStep1 without account returns Failure`() = runBlocking {
        val context = mockk<Context>(relaxed = true)
        val result = DriveVaultManager.provisionStep1(
            context = context,
            accountEmail = null,
            academicYear = "2026-2027",
            childName = "Aarav"
        )

        assertThat(result).isInstanceOf(ProvisionStep1Result.Failure::class.java)
        val failure = result as ProvisionStep1Result.Failure
        assertThat(failure.userMessage).contains("select your Google Account")
    }

    @Test
    fun `provisionStep1 with empty email returns Failure`() = runBlocking {
        val context = mockk<Context>(relaxed = true)
        val result = DriveVaultManager.provisionStep1(
            context = context,
            accountEmail = "   ",
            academicYear = "2026-2027",
            childName = "Aarav"
        )

        assertThat(result).isInstanceOf(ProvisionStep1Result.Failure::class.java)
    }
}
