import 'package:connectivity_plus/connectivity_plus.dart';

/// هل الجهاز مفيهوش أي اتصال خالص؟
/// ملحوظة: ده بيقول مفيش شبكة، لكن وجود شبكة مش ضمان إن الإنترنت شغال.
/// فالإرسال الفعلي هو الحكم النهائي.
Future<bool> isOffline() async {
  final results = await Connectivity().checkConnectivity();
  return results.every((r) => r == ConnectivityResult.none);
}
