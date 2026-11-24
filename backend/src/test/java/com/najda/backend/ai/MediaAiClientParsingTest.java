package com.najda.backend.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.najda.backend.ai.media.MediaAiClient;
import com.najda.backend.ai.media.MediaAiClient.PhotoDescription;
import com.najda.backend.ai.media.MediaAiClient.Transcription;
import org.junit.jupiter.api.Test;

class MediaAiClientParsingTest {

    @Test
    void readsTheDetectedLanguageAndKeepsTheSpokenWords() {
        Transcription heard = MediaAiClient.parseTranscription("LANGUAGE: ar\nإلحقونا في شارع الهرم");
        assertEquals("ar", heard.language());
        assertEquals("إلحقونا في شارع الهرم", heard.text());
    }

    @Test
    void acceptsARegionTagAndAWindowsLineBreak() {
        Transcription heard = MediaAiClient.parseTranscription("LANGUAGE: en-US\r\nPlease hurry");
        assertEquals("en", heard.language());
        assertEquals("Please hurry", heard.text());
    }

    @Test
    void toleratesABoldLabel() {
        Transcription heard = MediaAiClient.parseTranscription("**LANGUAGE:** ar\nمرحبا");
        assertEquals("ar", heard.language());
        assertEquals("مرحبا", heard.text());
    }

    @Test
    void stillReturnsTheTextWhenTheModelIgnoresTheFormat() {
        Transcription heard = MediaAiClient.parseTranscription("just the words");
        assertNull(heard.language());
        assertEquals("just the words", heard.text());
    }

    @Test
    void noSpeechIsAnEmptyTranscript() {
        assertEquals("", MediaAiClient.parseTranscription("NO_SPEECH").text());
    }

    @Test
    void splitsAPhotoIntoEnglishAndArabic() {
        PhotoDescription photo = MediaAiClient.parsePhoto("EN: A car on fire next to a bus stop.\nAR: سيارة مشتعلة بجوار موقف حافلات.");
        assertEquals("A car on fire next to a bus stop.", photo.english());
        assertEquals("سيارة مشتعلة بجوار موقف حافلات.", photo.arabic());
    }

    @Test
    void toleratesBoldLabelsOnAPhoto() {
        PhotoDescription photo = MediaAiClient.parsePhoto("**EN:** Smoke from a building.\n**AR:** دخان من مبنى.");
        assertEquals("Smoke from a building.", photo.english());
        assertEquals("دخان من مبنى.", photo.arabic());
    }

    @Test
    void keepsTheEnglishWhenTheArabicIsMissing() {
        PhotoDescription photo = MediaAiClient.parsePhoto("EN: only english here");
        assertEquals("only english here", photo.english());
        assertEquals("", photo.arabic());
    }

    @Test
    void anIrrelevantPhotoHasNoDescription() {
        PhotoDescription photo = MediaAiClient.parsePhoto("NOTHING_RELEVANT");
        assertEquals("", photo.english());
        assertEquals("", photo.arabic());
    }
}