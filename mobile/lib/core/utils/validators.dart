/// Password rules shown to the user and enforced before submit. Firebase's
/// Password Policy remains the source of truth server-side.
enum PasswordRule {
  length,
  uppercase,
  lowercase,
  number;

  bool test(String password) => switch (this) {
        PasswordRule.length => password.length >= 8,
        PasswordRule.uppercase => RegExp('[A-Z]').hasMatch(password),
        PasswordRule.lowercase => RegExp('[a-z]').hasMatch(password),
        PasswordRule.number => RegExp('[0-9]').hasMatch(password),
      };
}

bool isPasswordValid(String password) =>
    PasswordRule.values.every((rule) => rule.test(password));

final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
bool isValidEmailFormat(String email) => _emailPattern.hasMatch(email);

final _egyptMobile = RegExp(r'^1[0125]\d{8}$');
bool isValidEgyptianMobile(String localDigits) => _egyptMobile.hasMatch(localDigits);
String toE164EgyptianPhone(String localDigits) => '+20$localDigits';
String fromE164EgyptianPhone(String? phone) =>
    phone == null ? '' : phone.replaceFirst('+20', '');
