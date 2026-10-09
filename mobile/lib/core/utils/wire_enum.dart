/// Backend enums travel as UPPER_SNAKE strings. Enums that need an exact wire
/// code implement [WireEnum]; the rest derive it from their Dart name
/// (`firstResponder` -> `FIRST_RESPONDER`).
abstract interface class WireEnum {
  String get wire;
}

String enumToWire(Enum value) => value is WireEnum
    ? (value as WireEnum).wire
    : value.name
        .replaceAllMapped(RegExp('[A-Z]'), (m) => '_${m[0]}')
        .toUpperCase();

T enumFromWire<T extends Enum>(List<T> values, Object? wire, {T? fallback}) {
  final text = wire?.toString();
  for (final value in values) {
    if (enumToWire(value) == text) return value;
  }
  if (fallback != null) return fallback;
  throw FormatException('Unknown $T value: $wire');
}
