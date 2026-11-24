sealed class Failure {
  final String message;
  const Failure(this.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No internet connection']);
}

class ServerFailure extends Failure {
  final int? statusCode;
  const ServerFailure(super.message, {this.statusCode});
}

class AuthFailure extends Failure {
  const AuthFailure([super.message = 'Authentication failed']);
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}

class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'Something went wrong']);
}

/// أسباب فشل تحديد الموقع
enum LocationIssue {
  serviceDisabled,
  permissionDenied,
  permissionDeniedForever,
  unavailable,
  mockLocation,
  imprecise,
}

class LocationFailure extends Failure {
  final LocationIssue issue;
  const LocationFailure(this.issue, [super.message = 'Location unavailable']);
}
