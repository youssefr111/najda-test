import '../../../core/utils/wire_enum.dart';

enum Role {
  citizen,
  dispatcher,
  ambulanceCrew,
  police,
  firefighter,
  firstResponder,
  hospitalStaff,
  admin,
  superAdmin;

  static Role fromJson(Object? wire) => enumFromWire(Role.values, wire);

  /// Roles that get a dedicated field UI in this app (shift, missions).
  ///
  /// Desk roles (Dispatcher / Hospital Staff / Admin / Super Admin) have no
  /// mobile surface -- their work happens on the web console. They can still
  /// sign in, just as a citizen would, so a role check never locks anyone out.
  bool get isResponder => switch (this) {
        Role.ambulanceCrew ||
        Role.police ||
        Role.firefighter ||
        Role.firstResponder =>
          true,
        _ => false,
      };
}
