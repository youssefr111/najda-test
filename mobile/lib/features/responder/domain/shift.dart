import '../../../core/network/json.dart';
import '../../../core/utils/wire_enum.dart';

enum RoleInShift implements WireEnum {
  lead('LEAD'),
  crew('CREW');

  const RoleInShift(this.wire);
  @override
  final String wire;
}

class ShiftAssignment {
  const ShiftAssignment({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.unitId,
    required this.unitPlateNumber,
    required this.roleInShift,
    required this.startTime,
  });

  factory ShiftAssignment.fromJson(Map<String, dynamic> json) => ShiftAssignment(
        id: json['id'] as int,
        employeeId: json['employeeId'] as int,
        employeeName: json['employeeName'] as String? ?? '',
        unitId: json['unitId'] as int,
        unitPlateNumber: json['unitPlateNumber'] as String? ?? '',
        roleInShift: enumFromWire(RoleInShift.values, json['roleInShift']),
        startTime: parseDate(json['startTime']),
      );

  final int id;
  final int employeeId;
  final String employeeName;
  final int unitId;
  final String unitPlateNumber;
  final RoleInShift roleInShift;
  final DateTime startTime;

  bool get isLead => roleInShift == RoleInShift.lead;
}
