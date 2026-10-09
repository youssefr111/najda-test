#!/usr/bin/env python3
"""One-off converter: Expo i18next JSON locales -> Flutter ARB files.

Usage: python3 tools/convert_i18n.py <expo-locales-dir> <out-arb-dir> [<web-messages-dir>]

When the web messages directory is given, the namespaces in WEB_NAMESPACES are
imported too, so features that exist on the web but not in the old Expo app use
the web's exact copy.

* Flattens nested keys to lowerCamelCase  (auth.login.signIn -> authLoginSignIn).
* UPPER_SNAKE enum keys become CamelCase   (enums.role.FIRST_RESPONDER -> enumsRoleFirstResponder).
* Converts i18next {{var}} placeholders to ICU {var} and declares them in @metadata.
* Escapes apostrophes for the ICU parser.
* Drops the email-link flow strings and overlays the OTP-registration strings.
"""
import json, re, sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
web = Path(sys.argv[3]) if len(sys.argv) > 3 else None
out.mkdir(parents=True, exist_ok=True)

DROP_PREFIXES = ("auth.checkEmail.", "auth.completeSignup.", "auth.register.sendingLink", "auth.register.continueWithEmail")

OVERLAY = {
 "en": {
  "auth.register.firstNameLabel": "First name", "auth.register.lastNameLabel": "Last name",
  "auth.register.passwordLabel": "Password", "auth.register.confirmPasswordLabel": "Confirm password",
  "auth.register.sendCode": "Send verification code", "auth.register.resendCode": "Resend code",
  "auth.register.resendIn": "Resend code in {{seconds}}s",
  "auth.register.codeSentHint": "We sent a 6-digit code to {{email}}.",
  "auth.register.codeLabel": "Verification code", "auth.register.verify": "Verify",
  "auth.register.emailVerified": "Email verified",
  "auth.register.verifyEmailFirst": "Please verify your email first.",
  "auth.register.verificationExpired": "Your email verification expired. Please verify your email again.",
  "auth.register.invalidCode": "Invalid or expired code.",
  "auth.register.tooManyAttempts": "Too many attempts. Please request a new code.",
  "auth.register.tooManyRequests": "Too many requests. Please wait a moment and try again.",
  "auth.register.emailServiceUnavailable": "We couldn't send the email right now. Please try again shortly.",
  "auth.register.passwordInvalid": "Password does not meet the requirements.",
  "auth.register.passwordMismatch": "Passwords do not match.",
  "auth.register.createAccount": "Create account", "auth.register.creatingAccount": "Creating account...",
  "auth.register.addressLabel": "Address", "auth.register.genderLabel": "Gender",
  "auth.register.phoneAlreadyUsed": "This phone number is already verified on another account.",
  "responder.missions.ambulanceHandoffWeb": "Hospital handoff for ambulance missions is not available in the app yet — use the web console.",
  "auth.passwordRules.length": "At least 8 characters", "auth.passwordRules.uppercase": "One uppercase letter",
  "auth.passwordRules.lowercase": "One lowercase letter", "auth.passwordRules.number": "One number",
 },
 "ar": {
  "auth.register.firstNameLabel": "الاسم الأول", "auth.register.lastNameLabel": "اسم العائلة",
  "auth.register.passwordLabel": "كلمة المرور", "auth.register.confirmPasswordLabel": "تأكيد كلمة المرور",
  "auth.register.sendCode": "إرسال رمز التحقق", "auth.register.resendCode": "إعادة إرسال الرمز",
  "auth.register.resendIn": "إعادة الإرسال بعد {{seconds}} ث",
  "auth.register.codeSentHint": "أرسلنا رمزًا مكوّنًا من 6 أرقام إلى {{email}}.",
  "auth.register.codeLabel": "رمز التحقق", "auth.register.verify": "تحقق",
  "auth.register.emailVerified": "تم التحقق من البريد الإلكتروني",
  "auth.register.verifyEmailFirst": "يرجى التحقق من بريدك الإلكتروني أولًا.",
  "auth.register.verificationExpired": "انتهت صلاحية التحقق من بريدك الإلكتروني. يرجى التحقق مرة أخرى.",
  "auth.register.invalidCode": "الرمز غير صحيح أو منتهي الصلاحية.",
  "auth.register.tooManyAttempts": "محاولات كثيرة. يرجى طلب رمز جديد.",
  "auth.register.tooManyRequests": "طلبات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.",
  "auth.register.emailServiceUnavailable": "تعذّر إرسال البريد الإلكتروني حاليًا. يرجى المحاولة بعد قليل.",
  "auth.register.passwordInvalid": "كلمة المرور لا تستوفي المتطلبات.",
  "auth.register.passwordMismatch": "كلمتا المرور غير متطابقتين.",
  "auth.register.createAccount": "إنشاء حساب", "auth.register.creatingAccount": "جارٍ إنشاء الحساب...",
  "auth.register.addressLabel": "العنوان", "auth.register.genderLabel": "الجنس",
  "auth.register.phoneAlreadyUsed": "رقم الهاتف هذا موثّق بالفعل على حساب آخر.",
  "responder.missions.ambulanceHandoffWeb": "تسليم المريض للمستشفى لمهام الإسعاف غير متاح في التطبيق بعد — استخدم لوحة الويب.",
  "auth.passwordRules.length": "8 أحرف على الأقل", "auth.passwordRules.uppercase": "حرف كبير واحد على الأقل",
  "auth.passwordRules.lowercase": "حرف صغير واحد على الأقل", "auth.passwordRules.number": "رقم واحد على الأقل",
 },
}
INT_PLACEHOLDERS = {"id", "seconds", "count", "ms"}

# Web (next-intl) namespaces reused as-is; path is dotted into the web JSON.
WEB_NAMESPACES = [
    "cancelIncident",
    "responderTracking",
    "enums.cancellationCategory",
    "shiftStatusCard",
    "myMissionsPanel",
    "myMissionDetail",
    "missionRouteMap",
    "chat",
]

def flat(d, p=""):
    for k, v in d.items():
        key = f"{p}.{k}" if p else k
        if isinstance(v, dict):
            yield from flat(v, key)
        else:
            yield key, v

def _nest(dotted: str, node):
    result = node
    for part in reversed(dotted.split(".")):
        result = {part: result}
    return result

def camel(path: str) -> str:
    parts = []
    for seg in path.split("."):
        seg = seg.lower() if seg.isupper() or "_" in seg else seg
        words = [w for w in re.split(r"_+", seg) if w]
        parts.append(words[0] if not parts else words[0][:1].upper() + words[0][1:])
        parts.extend(w[:1].upper() + w[1:] for w in words[1:])
    name = "".join(parts)
    return name[:1].lower() + name[1:]

def convert(value: str):
    placeholders = list(dict.fromkeys(re.findall(r"\{\{?(\w+)\}?\}", value)))
    value = re.sub(r"\{\{(\w+)\}\}", r"{\1}", value)
    value = re.sub(r"</?\w+>", "", value)            # drop next-intl rich-text tags
    value = value.replace("''", "'").replace("'", "''")  # ICU: a literal ' is written ''
    return value, placeholders

for locale in ("en", "ar"):
    data = dict(flat(json.loads((src / f"{locale}.json").read_text(encoding="utf-8"))))
    data = {k: v for k, v in data.items() if not k.startswith(DROP_PREFIXES)}
    if web:
        web_json = json.loads((web / f"{locale}.json").read_text(encoding="utf-8"))
        for namespace in WEB_NAMESPACES:
            node = web_json
            for part in namespace.split("."):
                node = node[part]
            for key, value in flat({namespace: node} if "." not in namespace else _nest(namespace, node)):
                data.setdefault(key, value)
    data.update(OVERLAY[locale])
    arb = {"@@locale": locale}
    seen = {}
    for key, value in data.items():
        name = camel(key)
        assert name not in seen, f"collision: {key} vs {seen[name]}"
        seen[name] = key
        text, placeholders = convert(value)
        arb[name] = text
        if placeholders and locale == "en":
            arb[f"@{name}"] = {"placeholders": {p: {"type": "int" if p in INT_PLACEHOLDERS else "String"} for p in placeholders}}
    (out / f"app_{locale}.arb").write_text(json.dumps(arb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(locale, len([k for k in arb if not k.startswith("@")]), "keys")
