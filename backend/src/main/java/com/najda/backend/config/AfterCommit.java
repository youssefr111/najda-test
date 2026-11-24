package com.najda.backend.config;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Runs an action once the surrounding transaction has COMMITTED (immediately when there is none).
 *
 * Live-update nudges use it: a nudge sent from inside a transaction can reach a browser before the data is
 * committed, and the refetch it triggers then reads the OLD state -- the screen looks stale until the next
 * event. Publishing after commit means a client that refetches always sees what the event announced.
 */
public final class AfterCommit {

    private AfterCommit() {}

    public static void run(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
