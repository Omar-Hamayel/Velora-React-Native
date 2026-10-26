# Localization gaps

Date:26 October2026. **PARTIAL**. The supplied existing mobile app is integrated; the former 'mobile unavailable' blocker is resolved. Stage18 remains frozen; no Stage19/ML work began.

| Area | Current evidence | Remaining work | Status |
|---|---|---|---|
| Existing mobile runtime | en/ar i18next/Expo resources, persistence, account sync and API integration implemented | Continue testing the existing app, no replacement needed | Tested on browser |
| Native RTL/device | Conditional helpers tested; native locales declared; Android/iOS JS export succeeds; adb devices empty and no AVD configured | Connect a device or configure an approved existing emulator; verify development/native build layout/restart, arrows, keyboard, scrolling, bidi and small-screen text | Blocked by device availability |
| Arabic medical translations |40/40 catalog entries and30/30 reason codes have draft translations, actual IDs verified | Qualified bilingual/medical review of title, description, caution and reason meanings; mark REVIEWED only after real approval | NEEDS_MEDICAL_REVIEW |
| General UI copy | Current flow and record forms have both resources; two browser flows pass | Human copy review, longer text, accessibility and additional screen sizes | READY_FOR_REVIEW |
| Explanation completeness | Known codes localized; unknown/no-reason cases explicitly fall back to stored English | Review future versioned matched metadata if exact historical feature-specific explanation is required | Documented limitation |
| Disease catalog | Code-based numeric IDs, no English/Arabic name or row-order guessing; unavailable codes hidden/blocked | Approve distinct canonical Type2/hypercholesterolemia catalog content where only generic legacy rows exist; do not relabel patient diagnoses automatically | Existing product/medical gate |
| Goals and inactive navigation | Backend Goal routes exist; this mobile archive has no goals form and Plan/Progress/settings/social buttons have existing unfinished behavior | Product-defined features in existing architecture later; no duplicate endpoints/screens invented for localization | Outside current functional flow |
| Notification/email language | Mobile form/errors localized; email confirmation tested with real Identity tokens over local sink | Localize server email templates/notifications and confirmation/reset webpages separately; verify external delivery with approved credentials | Not implemented |
| Production environments | New isolated DB migration succeeds; original settings/data unchanged | Review earlier migration compatibility and HTTPS/network/service-to-service deployment config through approved process | Not deployed |
| Session persistence | Existing AsyncStorage retained, token refreshed on onboarding, 401 clears local session | Review platform-secure token storage for deployment separately; current task did not redesign storage | Existing architecture |
| Offline/backend policy | Localized HTTP errors, one25s client budget, explicit retry; existing backend .NET error suites pass | Further native offline/background/lifecycle tests | Partial device coverage |
| Lint/CI | Strict TypeScript,42 unit/helper tests,2 real browser E2E; no lint script existed | Add lint/CI through the existing team's conventions if desired | No standalone lint run claimed |

Native JS export/config checks are not installed-app/device tests. Browser E2E PASS does not imply production readiness or medical approval. See ARABIC_TRANSLATION_REVIEW.md and local evidence reports.
