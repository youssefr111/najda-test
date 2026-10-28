package com.najda.backend.user.dto;

import com.najda.backend.user.model.Governorate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * A structured Egyptian address. Letters (Arabic or Latin), digits, spaces and . , ' / # ( ) - only; at least one
 * letter, so "12345" or "!!!" is not an address. The same rules run in the web and mobile forms.
 */
public record AddressRequest(
        @NotNull Governorate governorate,
        @NotBlank @Size(min = 2, max = 100) @Pattern(regexp = Text.PATTERN, message = "City contains invalid characters") String city,
        @NotBlank @Size(min = 3, max = 200) @Pattern(regexp = Text.PATTERN, message = "Street contains invalid characters") String street,
        @Size(max = 200) @Pattern(regexp = "^$|" + Text.PATTERN, message = "Landmark contains invalid characters") String landmark) {

    /** Shared by the annotations above (must be a compile-time constant). */
    static final class Text {
        static final String PATTERN = "^(?=.*\\p{L})[\\p{L}\\p{N} .,'/#()\\-\\u060C]+$";

        private Text() {}
    }
}
