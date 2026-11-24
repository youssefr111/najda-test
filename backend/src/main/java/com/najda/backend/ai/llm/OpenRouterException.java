package com.najda.backend.ai.llm;

/** OpenRouter answered with a non-200 status. Callers use {@link #status()} to tell retryable from permanent. */
public class OpenRouterException extends RuntimeException {

    private final int status;

    public OpenRouterException(int status, String body) {
        super("OpenRouter request failed: HTTP " + status + " " + body);
        this.status = status;
    }

    public int status() {
        return status;
    }

    /** 429 / 408 / 5xx may succeed later. Other 4xx mean this request itself is wrong, so retrying is pointless. */
    public boolean isRetryable() {
        return status == 429 || status == 408 || status >= 500;
    }
}
