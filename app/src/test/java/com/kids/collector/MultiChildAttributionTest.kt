package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.domain.router.MultiChildRouter
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class MultiChildAttributionTest {

    private lateinit var router: MultiChildRouter
    private val anvesha = ChildProfile(
        childId = "c1",
        firstName = "Anvesha",
        grade = "Grade 8",
        academicYear = "2026-2027",
        schoolName = "SJBHS",
        accountEmail = "anvesharprasad@sjbhs.org",
        disambiguationTag = "8B"
    )
    private val atharva = ChildProfile(
        childId = "c2",
        firstName = "Atharva",
        grade = "Grade 3",
        academicYear = "2026-2027",
        schoolName = "MyGlobal",
        accountEmail = "atharva.chaodhari@myglobal.school",
        disambiguationTag = "3B"
    )

    @BeforeEach
    fun setUp() {
        router = MultiChildRouter(listOf(anvesha, atharva))
    }

    @Test
    fun `routes correctly by student account email match`() {
        val target = router.route(
            senderOrGroup = "Google Classroom",
            title = "Math HW",
            body = "Chapter 4",
            accountEmail = "anvesharprasad@sjbhs.org"
        )
        assertThat(target?.childId).isEqualTo(anvesha.childId)
    }

    @Test
    fun `routes correctly by child first name in body`() {
        val target = router.route(
            senderOrGroup = "School ERP",
            title = "Fee Receipt",
            body = "Receipt generated for Atharva for term 1"
        )
        assertThat(target?.childId).isEqualTo(atharva.childId)
    }

    @Test
    fun `routes correctly by section tag`() {
        val target = router.route(
            senderOrGroup = "WhatsApp",
            title = "Notice for 8B parents",
            body = "Science project submission details"
        )
        assertThat(target?.childId).isEqualTo(anvesha.childId)
    }
}
