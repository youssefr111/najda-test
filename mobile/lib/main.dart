import 'bootstrap.dart';

/// One entry point for every flavor. The flavor (`--flavor local|test|production`)
/// decides which env file is loaded -- see `core/config/flavor.dart`.
Future<void> main() => bootstrap();
