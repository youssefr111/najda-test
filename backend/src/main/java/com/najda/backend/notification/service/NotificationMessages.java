package com.najda.backend.notification.service;

import com.najda.backend.notification.model.NotificationType;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The single source of notification wording, in English and Arabic. Clients
 * never write notification text: they show what the server stored (inbox) or
 * what the push carried, in the user's language.
 */
public final class NotificationMessages {

    public static final String EN = "en";
    public static final String AR = "ar";

    private NotificationMessages() {}

    public record Text(String title, String body) {}

    public static Map<String, String> title(NotificationType type, Map<String, String> params) {
        return both(type, params, true);
    }

    public static Map<String, String> body(NotificationType type, Map<String, String> params) {
        return both(type, params, false);
    }

    /** Picks the right language, defaulting to English. */
    public static String pick(Map<String, String> text, String locale) {
        String language = locale == null ? EN : locale.toLowerCase().startsWith("ar") ? AR : EN;
        return text.getOrDefault(language, text.getOrDefault(EN, ""));
    }

    private static Map<String, String> both(NotificationType type, Map<String, String> params, boolean title) {
        Map<String, String> result = new LinkedHashMap<>();
        for (String language : new String[] {EN, AR}) {
            Text text = render(type, language, params);
            result.put(language, title ? text.title() : text.body());
        }
        return result;
    }

    private static Text render(NotificationType type, String lang, Map<String, String> p) {
        boolean ar = AR.equals(lang);
        String id = p.getOrDefault("id", "?");
        String category = category(p.get("category"), ar);
        String unit = p.getOrDefault("unit", ar ? "وحدة" : "A unit");
        String sender = p.getOrDefault("sender", ar ? "مستخدم" : "Someone");
        String hospital = p.getOrDefault("hospital", ar ? "المستشفى" : "the hospital");

        return switch (type) {
            case INCIDENT_NEW -> ar
                    ? new Text("بلاغ " + category + " جديد", "البلاغ رقم " + id + " بحاجة إلى إرسال وحدة.")
                    : new Text("New " + category + " emergency", "Report #" + id + " needs a unit.");
            case INCIDENT_CANCELLED_BY_CITIZEN -> ar
                    ? new Text("تم إلغاء البلاغ رقم " + id, "قام المُبلِّغ بإلغاء هذا البلاغ.")
                    : new Text("Report #" + id + " cancelled", "The citizen cancelled this report.");
            case MISSION_REJECTED -> ar
                    ? new Text("رفضت وحدة المهمة", unit + " رفضت البلاغ رقم " + id + ". عيّن وحدة أخرى.")
                    : new Text("A unit declined a mission", unit + " declined report #" + id + ". Assign another unit.");
            case MISSION_WITHDRAWN -> ar
                    ? new Text("انسحبت وحدة من مهمة", unit + " انسحبت من البلاغ رقم " + id + ". أعد التعيين إذا لزم.")
                    : new Text("A unit withdrew from a mission", unit + " withdrew from report #" + id + ". Reassign if needed.");
            case APPLICATION_SUBMITTED -> ar
                    ? new Text("طلب مستجيب جديد", sender + " تقدّم بطلب ليصبح مستجيبًا.")
                    : new Text("New responder application", sender + " applied to become a responder.");
            case MISSION_OFFERED -> ar
                    ? new Text("مهمة جديدة", "بلاغ " + category + " رقم " + id + ". افتح التطبيق للقبول.")
                    : new Text("New mission", category + " emergency, report #" + id + ". Open the app to accept.");
            case MISSION_CANCELLED -> ar
                    ? new Text("أُلغيت المهمة", "لم يعد البلاغ رقم " + id + " بحاجة إلى وحدتك.")
                    : new Text("Mission cancelled", "Report #" + id + " no longer needs your unit.");
            case PATIENT_INCOMING -> ar
                    ? new Text("مريض قادم", unit + " تنقل مريضًا إلى " + hospital + ".")
                    : new Text("Incoming patient", unit + " is bringing a patient to " + hospital + ".");
            case INCIDENT_ACCEPTED -> ar
                    ? new Text("المساعدة في الطريق", "قبلت وحدة استجابة بلاغك رقم " + id + ".")
                    : new Text("Help is on the way", "A response unit accepted your report #" + id + ".");
            case INCIDENT_EN_ROUTE -> ar
                    ? new Text("وحدة متجهة إليك", "فريق الاستجابة في طريقه إلى موقعك.")
                    : new Text("A unit is heading to you", "Your responders are on their way.");
            case INCIDENT_ARRIVED -> ar
                    ? new Text("وصل فريق الاستجابة", "توجد وحدة الآن في موقعك.")
                    : new Text("Responders have arrived", "A unit is now at your location.");
            case INCIDENT_RESOLVED -> ar
                    ? new Text("تم إغلاق بلاغك", "تم إغلاق البلاغ رقم " + id + ". سلامتك تهمنا.")
                    : new Text("Your report was closed", "Report #" + id + " has been resolved. Stay safe.");
            case INCIDENT_CLOSED_FALSE_REPORT -> ar
                    ? new Text("أُغلق البلاغ", "أغلقت غرفة الإرسال البلاغ رقم " + id + " بعد المراجعة.")
                    : new Text("Report closed", "Dispatch closed report #" + id + " after review.");
            case INCIDENT_CLOSED_DUPLICATE -> ar
                    ? new Text("تم دمج البلاغ", "البلاغ رقم " + id + " مكرر لبلاغ آخر يجري التعامل معه بالفعل.")
                    : new Text("Report merged", "Report #" + id + " duplicates another report that is already being handled.");
            case APPLICATION_APPROVED -> ar
                    ? new Text("تمت الموافقة على طلبك", "أصبحت الآن مستجيبًا. أهلًا بك في الفريق!")
                    : new Text("Application approved", "You're now a first responder. Welcome to the team!");
            case APPLICATION_REJECTED -> ar
                    ? new Text("لم تتم الموافقة على طلبك", "افتح التطبيق للاطلاع على سبب المراجع.")
                    : new Text("Application not approved", "Open the app to read the reviewer's reason.");
            case LEGAL_UPDATED -> ar
                    ? new Text("تم تحديث " + legalDocument(p.get("document"), true), "افتح التطبيق للمراجعة والموافقة.")
                    : new Text("We updated our " + legalDocument(p.get("document"), false), "Please review and accept it to keep using NAJDA.");
            case CHAT_MESSAGE -> ar
                    ? new Text("رسالة جديدة من " + sender, "افتح البلاغ للقراءة والرد.")
                    : new Text("New message from " + sender, "Open the report to read and reply.");
        };
    }

    private static String category(String code, boolean ar) {
        if (code == null) return ar ? "طوارئ" : "emergency";
        return switch (code.toUpperCase()) {
            case "MEDICAL" -> ar ? "طبي" : "medical";
            case "FIRE" -> ar ? "حريق" : "fire";
            case "POLICE" -> ar ? "شرطة" : "police";
            default -> ar ? "طوارئ" : "emergency";
        };
    }

    private static String legalDocument(String code, boolean ar) {
        if (code == null) return ar ? "الشروط والسياسات" : "legal documents";
        return switch (code.toUpperCase()) {
            case "TERMS" -> ar ? "الشروط والأحكام" : "Terms & Conditions";
            case "PRIVACY" -> ar ? "سياسة الخصوصية" : "Privacy Policy";
            default -> ar ? "الشروط والسياسات" : "legal documents";
        };
    }
}
