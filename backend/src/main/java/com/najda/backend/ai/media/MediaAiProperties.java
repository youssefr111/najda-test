package com.najda.backend.ai.media;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.unit.DataSize;

/**
 * Which OpenRouter models read voice notes, videos and photos ({@code najda.ai.media.*}). Uses the same
 * OPENROUTER_API_KEY as the rest of the AI code.
 *
 * @param enabled            kill switch. When false, attachments are stored but not analysed.
 * @param transcriptionModel model that listens to audio (voice notes and the audio track of videos).
 * @param visionModel        model that describes photos.
 * @param maxPayload         largest prepared audio / image sent to a model.
 * @param maxAttempts        how many times one attachment is tried before it is marked FAILED. Free models are
 * @param ffmpegPath         path to ffmpeg binary. Used to convert audio and video to formats that the models can read.
 *                           rate limited and sometimes unavailable, so this is higher than it would be on a paid plan.
 */
@ConfigurationProperties(prefix = "najda.ai.media")
public record MediaAiProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free") String transcriptionModel,
        @DefaultValue("nvidia/nemotron-3.5-super-vl:free") String visionModel,
        @DefaultValue("15MB") DataSize maxPayload,
        @DefaultValue("5") int maxAttempts,
        @DefaultValue("ffmpeg") String ffmpegPath) {

    public boolean active() {
        return enabled;
    }
}
