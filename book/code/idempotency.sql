-- One incident per (citizen, client request id): the database-level guarantee
-- behind idempotent submission.
CREATE UNIQUE INDEX uq_incidents_citizen_client_request
    ON public.incidents (citizen_id, client_request_id)
    WHERE client_request_id IS NOT NULL;
