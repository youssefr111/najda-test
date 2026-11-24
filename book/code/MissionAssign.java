    public MissionResponse assignUnitMission(Long dispatcherId, Long incidentId, Long unitId) {
        Incident incident = requireIncident(incidentId);

        if (TERMINAL_STATUSES.contains(incident.getStatus())) {
            throw new ConflictException("This incident is already " + incident.getStatus() + " -- units can no longer be assigned to it");
        }

        ResponseUnit unit = responseUnitRepository.findByIdForUpdate(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        if (unit.getArchivedAt() != null) {
            throw new ConflictException("This unit has been retired");
        }

        if (unit.getStatus() != UnitStatus.AVAILABLE) {
            throw new ConflictException("This unit is no longer available -- it may have just been assigned");
        }

        shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(unitId, RoleInShift.LEAD)
                .orElseThrow(() -> new ConflictException("This unit has no active LEAD"));

        // A responder can report an emergency too. The unit they crew must never be sent to their own report:
        // they are the one who needs help, not the one who can give it.
        boolean reporterIsOnThisUnit = shiftAssignmentRepository.findByUnitIdAndEndTimeIsNull(unitId).stream()
                .anyMatch(shift -> shift.getEmployee().getId().equals(incident.getCitizen().getId()));
        if (reporterIsOnThisUnit) {
            throw new ConflictException(
                    "The person who reported this emergency is on this unit's crew -- assign a different unit");
        }

        Mission mission = new Mission();
        mission.setIncident(incident);
