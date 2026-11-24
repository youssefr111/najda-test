package com.najda.backend.incident;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.najda.backend.incident.service.MissionCrewSync;
import com.najda.backend.incident.service.MissionCrewSync.Plan;
import java.util.List;
import org.junit.jupiter.api.Test;

class MissionCrewSyncTest {

    @Test
    void leavesAnUnchangedCrewAlone() {
        Plan plan = MissionCrewSync.plan(List.of(1L, 2L), List.of(1L, 2L));
        assertEquals(List.of(), plan.deleteRows());
        assertEquals(List.of(), plan.addUsers());
    }

    @Test
    void dropsSomeoneWhoLeftAndAddsSomeoneWhoJoined() {
        // rows: [user 1, user 2]; the unit now has users 1 and 3
        Plan plan = MissionCrewSync.plan(List.of(1L, 2L), List.of(1L, 3L));
        assertEquals(List.of(1), plan.deleteRows());
        assertEquals(List.of(3L), plan.addUsers());
    }

    @Test
    void keepsOneRowWhenSomeoneHasDuplicates() {
        Plan plan = MissionCrewSync.plan(List.of(1L, 1L), List.of(1L));
        assertEquals(List.of(1), plan.deleteRows());
        assertEquals(List.of(), plan.addUsers());
    }

    @Test
    void addsTheWholeCrewWhenThereAreNoParticipantsYet() {
        Plan plan = MissionCrewSync.plan(List.of(), List.of(5L, 6L));
        assertEquals(List.of(), plan.deleteRows());
        assertEquals(List.of(5L, 6L), plan.addUsers());
    }

    @Test
    void removesEveryoneWhenNobodyIsOnTheUnitAnymore() {
        Plan plan = MissionCrewSync.plan(List.of(1L, 2L), List.of());
        assertEquals(List.of(0, 1), plan.deleteRows());
        assertEquals(List.of(), plan.addUsers());
    }
}