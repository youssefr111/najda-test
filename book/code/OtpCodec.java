    /** Keyed hash bound to the email, so a leaked hash is useless without the server secret. */
    public String hashOtp(String email, String code) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(hmacKey);
            byte[] digest = mac.doFinal((email + ':' + code).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 is unavailable", e);
        }
    }

    public boolean otpMatches(String email, String code, String expectedHash) {
        return constantTimeEquals(hashOtp(email, code), expectedHash);
    }

    /** 256 bits of randomness -- high enough entropy that a plain SHA-256 is sufficient for storage. */
