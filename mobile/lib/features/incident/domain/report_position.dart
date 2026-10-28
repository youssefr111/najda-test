import 'incident.dart';

/// Where the citizen is reporting from. The device's own fix is always carried
/// along: the server checks a manually moved pin against it.
class ReportPosition {
  const ReportPosition({
    required this.latitude,
    required this.longitude,
    required this.source,
    required this.deviceLatitude,
    required this.deviceLongitude,
  });

  /// The GPS fix itself: the pin sits exactly on the device.
  const ReportPosition.gps({
    required double latitude,
    required double longitude,
  }) : this(
         latitude: latitude,
         longitude: longitude,
         source: LocationSource.gps,
         deviceLatitude: latitude,
         deviceLongitude: longitude,
       );

  final double latitude;
  final double longitude;
  final LocationSource source;
  final double deviceLatitude;
  final double deviceLongitude;
}
