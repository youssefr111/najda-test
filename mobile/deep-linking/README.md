# Universal Links / App Links setup

These two files let iOS and Android open the NAJDA app directly from the
registration email link, instead of a browser — the same
`https://yourdomain/complete-signup?...` URL Firebase already sends works
for both; the OS decides whether to hand it to the app or the browser based
on these files.

## Where they go

Both files are hosted by your **web app** (najda-web), not the mobile repo:

```
web/public/.well-known/apple-app-site-association   (no file extension, exact filename)
web/public/.well-known/assetlinks.json
```

Next.js serves everything under `public/` at the domain root automatically,
so once deployed they'll be reachable at:
- `https://yourdomain.com/.well-known/apple-app-site-association`
- `https://yourdomain.com/.well-known/assetlinks.json`

`apple-app-site-association` must be served with `Content-Type:
application/json` (Next.js's static file serving does this automatically
for files with no extension only if you add a small route handler — see
note below) and **without** a `.json` extension; a CDN/host that forces one
will break it.

> If your host insists on an extension, add a route handler at
> `app/.well-known/apple-app-site-association/route.ts` that returns the
> file contents with `Content-Type: application/json` set explicitly,
> rather than relying on static file serving.

## Filling in the placeholders

- **`YOUR_APPLE_TEAM_ID`** (iOS) — found in the Apple Developer portal,
  Membership page. Combine with the bundle identifier as
  `TEAMID.com.najda.mobile`.
- **`YOUR_APP_SIGNING_SHA256_FINGERPRINT`** (Android) — for an EAS-built
  app: `eas credentials`, pick Android → your build profile → "Android
  Keystore" → it prints the SHA-256. For a Play Store release, use the
  fingerprint from Play Console → Setup → App integrity instead (Play may
  re-sign your app with its own key).
- **`YOUR_WEB_DOMAIN`** in `app.json`'s `associatedDomains` /
  `intentFilters` — your production web app's domain, no `https://` prefix,
  e.g. `najda.example.com`.

## Important: this needs a development build, not Expo Go

`associatedDomains` (iOS) and `intentFilters` (Android) are native
configuration — Expo Go's shell app can't pick up per-project native
config, so this only takes effect in a **development build**
(`npx expo run:ios` / `run:android`, or an EAS dev client) or a production
build. Until then, tapping the email link still works exactly as it does
today — it opens the existing web `/complete-signup` page in a browser,
which is unaffected by any of this.

## Testing it

- iOS validates the AASA file at install time and caches the result —
  reinstalling the app (not just reloading JS) after changing the file is
  usually required to see a change take effect.
- Android: `adb shell pm get-app-links com.najda.mobile` shows whether
  verification succeeded.
- Both platforms silently fall back to opening the browser if verification
  fails for any reason (wrong fingerprint, file not reachable, wrong
  content type) — there's no error shown to the user, so if it's not
  working, the browser fallback path (already working today) is what
  you'll see, not a broken link.
