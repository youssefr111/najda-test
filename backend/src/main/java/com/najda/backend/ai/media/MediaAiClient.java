package com.najda.backend.ai.media;

import com.najda.backend.ai.llm.OpenRouterClient;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Turns audio and images into plain text with OpenRouter multimodal models. */
@Component
public class MediaAiClient {

    private static final String NO_SPEECH = "NO_SPEECH";
    private static final String NOTHING_RELEVANT = "NOTHING_RELEVANT";

    private static final String TRANSCRIBE_SYSTEM = """
            You are a speech transcription engine for an emergency dispatch system.
            Transcribe the audio exactly as spoken, in the language that is spoken. The speaker may use Arabic
            (including Egyptian dialect), English, or a mix of both. Keep Arabic in Arabic script. Do not translate.
            Include everything said, even fragments, panicked speech and background voices that are clearly audible.
            Do not summarise, explain, or add anything that was not said.
            Answer in exactly this form:
            LANGUAGE: <the ISO 639-1 code of the main language you hear, for example ar or en>
            <the transcript, starting on the next line>
            If there is no intelligible speech, output exactly: NO_SPEECH
            """;

    private static final String DESCRIBE_SYSTEM = """
            You describe photos attached to an emergency report, for an emergency dispatcher.
            In 2 to 4 short factual sentences, state only what is visible and relevant to the emergency:
            injuries or bleeding, how many people and their apparent condition (conscious, lying down, trapped),
            fire, smoke, vehicles and damage, weapons, hazards, and any location clues such as street signs,
            shop names or landmarks.
            Never identify or guess who anyone is. Do not speculate beyond what you can see.
            Answer in exactly this form, with nothing before or after it:
            EN: <the description in English>
            AR: <the same description in clear Modern Standard Arabic>
            If the photo shows nothing relevant to an emergency, output exactly: NOTHING_RELEVANT
            """;

    /** First line of a transcription answer: the language the model heard, e.g. {@code LANGUAGE: ar}. */
    private static final Pattern LANGUAGE_LINE =
            Pattern.compile("^\\s*LANGUAGE\\s*:\\s*([A-Za-z]{2,3})(?:-[A-Za-z]+)?\\s*(?:\\R|$)", Pattern.CASE_INSENSITIVE);

    /** A photo answer: the English part, then the Arabic part. */
    private static final Pattern PHOTO_ANSWER =
            Pattern.compile("(?is)\\bEN\\s*:\\s*(.*?)\\s*\\bAR\\s*:\\s*(.*)");

    /** What the model heard: the words, and the language it detected (ISO 639-1, lower case), null when it did not say. */
    public record Transcription(String text, String language) {}

    /** What the model saw: English for the dispatch AI, and the same description in Arabic for the dispatchers. */
    public record PhotoDescription(String english, String arabic) {}

    private final OpenRouterClient llm;
    private final MediaAiProperties props;

    public MediaAiClient(OpenRouterClient llm, MediaAiProperties props) {
        this.llm = llm;
        this.props = props;
    }

    /**
     * @param format audio container: "mp3", "wav", ...
     * @return the transcript, or an empty string when there is no intelligible speech
     */
    public Transcription transcribe(byte[] audio, String format) throws Exception {
        List<Map<String, Object>> content = List.of(
                Map.of("type", "text", "text", "Transcribe this recording."),
                Map.of("type", "input_audio", "input_audio",
                        Map.of("data", Base64.getEncoder().encodeToString(audio), "format", format.toLowerCase(Locale.ROOT))));
        String answer = llm.chat(props.transcriptionModel(), TRANSCRIBE_SYSTEM, content, 4096)
                .orElseThrow(() -> new IllegalStateException("The transcription model returned no text"));
        return parseTranscription(answer);
    }

    /** @return a short factual description, or an empty string when the photo is not relevant */
    public PhotoDescription describePhoto(byte[] image, String mimeType) throws Exception {
        String dataUrl = "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(image);
        List<Map<String, Object>> content = List.of(
                Map.of("type", "text", "text", "Describe this photo for the dispatcher."),
                Map.of("type", "image_url", "image_url", Map.of("url", dataUrl)));
        String answer = llm.chat(props.visionModel(), DESCRIBE_SYSTEM, content, 2048)
                .orElseThrow(() -> new IllegalStateException("The vision model returned no text"));
        return parsePhoto(answer);
    }

    /** Splits "LANGUAGE: ar" and the transcript apart. A model that ignores the format still yields its text. */
    public static Transcription parseTranscription(String answer) {
        String text = clean(answer);
        if (text.contains(NO_SPEECH)) return new Transcription("", null);
        Matcher line = LANGUAGE_LINE.matcher(text);
        if (line.find()) {
            return new Transcription(text.substring(line.end()).strip(), line.group(1).toLowerCase(Locale.ROOT));
        }
        return new Transcription(text, null);
    }

    /** Splits "EN: ... AR: ..." apart. A model that ignores the format still yields its text as the English part. */
    public static PhotoDescription parsePhoto(String answer) {
        String text = clean(answer);
        if (text.contains(NOTHING_RELEVANT)) return new PhotoDescription("", "");
        Matcher parts = PHOTO_ANSWER.matcher(text);
        if (parts.find()) {
            return new PhotoDescription(parts.group(1).strip(), parts.group(2).strip());
        }
        return new PhotoDescription(text.replaceFirst("(?is)^\\s*EN\\s*:\\s*", "").strip(), "");
    }

    /** Models like to bold the labels ("**EN:**"): drop that so the labels can be found. */
    private static String clean(String answer) {
        return answer.replace("**", "").replace("`", "").strip();
    }
}
