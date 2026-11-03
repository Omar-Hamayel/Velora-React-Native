# Mobile localization test results

## Daily recommendations — 3 November 2026

Implemented Remaining today / Completed today / History tabs, persisted completion and undo, dislike hiding/clearing, last-update metadata, daily-plan ensure/poll, read-only Refresh, retry cooldown and incomplete/stale handling. Missing daily-plan endpoints show an explicit backend-update message instead of presenting old advice as current. History uses the existing owned `/my` route with bounded pages. Device time zone is validated/persisted by the backend; native AppState and next-day scheduling use the same explicit ensure flow.

`npm run typecheck`: exit 0. `npm test -- --reporter=dot`: exit 0, **56 passed**. Full `npx playwright test --config playwright.sdk-upgrade.config.ts`: exit 0, **12 passed**; focused lifecycle scenarios rerun after visual captures: **3 passed**. Reviewed `test-results/daily-completed-en.png`, `daily-completed-ar.png` and `daily-pending-ar.png`. Synthetic fixtures intercept all API calls; no production account/SMTP/SQL mutation was performed by UI tests. Companion backend verification passed **183** .NET tests with real private FastAPI and isolated LocalDB; Python passed **232** tests. The matching backend migration/Python deployment must precede this mobile update. Native phone/VPS deployment remain unverified.

Earlier lifecycle fixture assertions were corrected for completion labels containing timestamps and the intentionally asynchronous onboarding state; final tests pass. Existing RTL/login/calendar/condition-management regressions remain covered. See the backend `docs/integration/DAILY_RECOMMENDATION_LIFECYCLE.md` for exact policy, API additions, migration and commands.

## App-wide Arabic alignment — 3 November 2026

The shared Text component now enforces right alignment and RTL writing for Arabic after screen styles. Shared inputs align at the right in Arabic, including placeholders; populated email/password/numeric/date values retain LTR character order, and Arabic text entry remains RTL. An explicit content-direction option preserves the existing English explanation fallback without translating or altering its snapshot. English alignment is restored on language changes.

Added the runtime `LocalizedView` component at the application root and all three Modal roots (language, calendar, condition removal). It supplies native Yoga direction and the web `dir` property used by React Native Web's logical start/end layout context. Remember me now inherits this explicit root direction instead of depending on a global-direction row-reversal workaround. Expanded form labels/errors and intro/profile headings where centered or narrow containers prevented a full-width text alignment. Existing backend settings, endpoints, data and authentication were unchanged.

Verification in `D:/Velora-React-Native-main` with the existing Expo SDK 58 project and headless Edge, using synthetic intercepted API responses only:

| Command | Exit | Evidence |
|---|---|---|
| `npm test -- --reporter=dot` | 0 | 54 passed, 4 files |
| `npm run typecheck` | 0 | No TypeScript errors |
| `npx playwright test --config playwright.sdk-upgrade.config.ts` | 0 | 10 passed, including the existing login, feedback, calendar, persistence and language-switching regressions |
| `npx playwright test --config playwright.sdk-upgrade.config.ts --grep 'Arabic intro and registration\|Arabic home, profile\|Arabic health onboarding'` | 0 | 3 passed after tightening splash/transition readiness for screenshots |
| `git diff --check` | 0 | No whitespace errors |

New browser scenarios inspect the computed alignment/direction of rendered Arabic strings across intro, registration/validation, Home, Profile/editing, lab/BP/medication forms, and all three health-onboarding steps. They verify the physical RTL navigation order, modal direction, Arabic input/digit handling, preserved LTR email/numeric values, and English input alignment after switching back. Visually reviewed `test-results/rtl-registration-ar.png`, `test-results/rtl-medication-ar.png` and `test-results/rtl-health-conditions-ar.png` after the actual launch splash and transitions finish.

Initial new tests exposed ambiguous Cancel selectors during a Modal fade and an expected preference PATCH in the fixture's mutation list; those test assertions were corrected. Early screenshots captured the launch splash; readiness waits were corrected and the three new scenarios rerun successfully. No production account, SQL writes or real email were used. Physical Android/iOS/Expo Go verification remains unperformed; reload the phone's app to load these local source changes.

## Historical baseline — 26 October 2026

Date26 October2026. Final mobile helper/API/unit tests: **42 passed /0 failed**. Real browser E2E scenarios: **2 passed /0 failed**. Combined44 mobile automated cases. Strict TypeScript exit0; Expo all-platform export exit0; native config introspection exit0. These are not installed Android/iOS device tests. No lint script existed, so no standalone lint success is claimed.

Environment: existing Expo54/React19.1/ReactNative0.81.5/TypeScript5.9 source archive, Node24, installed headless Microsoft Edge, Windows; npm package versions locked in package-lock.json. Added only missing expo-localization, i18next, react-i18next and native reload support expo-updates; expo-asset supports the focused web-video lifecycle fix; Vitest/Playwright support requested verification. Existing dependencies/branding/screens/navigation remain.

| Command in mobile directory | Exit | Evidence |
|---|---|---|
|npm ci --no-audit --no-fund before edits|0|npm-baseline-install.txt |
|npx tsc --noEmit baseline|0|typecheck-baseline.txt |
|npm run typecheck final|0|typecheck-final.txt |
|npm test final|0;42 passed|mobile-tests-final.txt |
|npx expo export --platform all --output-dir dist|0;web,Android,iOS bundles|expo-export-all-final.txt |
|npx expo config --type introspect --json|0;native en/ar declared|expo-native-config.json |
|VELORA_MOBILE_EVIDENCE=<fixture-dir>, npx playwright test|0;2 passed|e2e-final.txt,e2e-results.json,flow-en.json,flow-ar.json |
|adb devices; emulator -list-avds|0;no device/no AVD|android-devices.txt,android-avds.txt |

All evidence paths above are under the audit workspace/mobile-evidence unless noted. Copy of Playwright machine results is preserved there; test source is mobile/tests/e2e/local-flow.spec.ts. Authentication credentials are synthetic and neither JWT values nor full health payloads are logged. Test traces are off.

## Cases

Resources/init/fallback, all40 ID-keyed title/description pairs, all30 codes, unknown fallback, Arabic/Persian digits and unchanged units, canonical mapping across en/ar, manual/device/backend precedence, local persistence and failed-sync retry, no health mutation/regeneration from language, safe base URLs, actual lookup IDs/ambiguous-diagnosis blocking, real-shaped JWT storage/refresh, account separation, existing route mapping, incomplete-profile partial saves without generation, optional measurements omitted, Father/Mother mapping, feedback and completion body, HTTP400/401/403/404/422/500/503 sanitized, network failure and single25s timeout, and conditional native RTL/reload helper behavior.

The two browser tests independently register/confirm/login synthetic English/Arabic users, submit actual forms, observe no early SQL generation, complete onboarding, observe5 recommendations, like/complete, switch language, reopen, inspect translated lab/BP/medication form labels, and verify identical existing recommendation rows/batch/fingerprint. Local SMTP confirmation uses real Identity tokens, not manually confirmed database users or forged JWTs. SQL profile comparison additionally proves the separately entered Arabic/English health values are identical.

## Earlier failures, retained transparently

- One-time UI extraction hit a duplicate HbA1c key; extraction was corrected to disambiguate labels and preserve canonical values. This was tooling, not a claimed passing test.
- Initial typecheck found3 implementation issues (missing type import, current i18next initialization option, missing return); fixed. A later focused video refactor had a transient syntax/import error; typecheck caught it before final export.
- Initial mobile run34 passed/3 failed: Arabic digit regex had an encoding defect; two mocks incorrectly reused consumed Response bodies. Regex now uses Unicode escapes and mock responses are fresh. Final42 pass.
- First browser run1 passed/1 failed: Arabic's full data flow succeeded, but strict page-error assertion caught2 unhandled web-video playback interruption promises. The web video component now uses browser autoplay without dangling imperative play promises; both complete browser scenarios pass without ignoring/filtering errors.
- First browser export lacked its explicit release API configuration and was correctly rejected by the URL guard. Local .env.local now supplies explicit loopback origin and loopback-only HTTP test opt-in; release HTTPS requirements remain.
- Automatic approval review rejected the Expo dev-server command ('blocked by policy'). The safer supported fallback, a real Expo static export served on loopback, was used for both working E2E flows. No security bypass, auth disabling or certificate override occurred.

Earlier stdout/failure screenshots are retained in audit evidence. No failing final tests are being hidden. General dependency/preview/Identity/deprecation warnings are documented, not silently called fixed. Native installed-app/RTL, external SMTP and medical approval remain outside demonstrated acceptance.

## Domain reachability and Arabic Remember me — 2 November 2026

The configured API origin remains `https://api.qusaybdier.com`; no URL, backend settings or credentials were changed. Direct public checks of the reset page and protected routes returned HTTP 530; an empty JSON POST to `/api/Identity/Auth/login` also returned 530 with the plain-text Cloudflare body `error code: 1033`. No real credentials were submitted. The user's Ubuntu check returned HTTP 200 from `http://127.0.0.1:8080/reset-password.html`, while `cloudflared` was active but repeatedly logged QUIC edge-connection timeouts. This isolates the observed outage to the tunnel's connection to Cloudflare; actual remote repair is being handled by the user and is not claimed complete.

Remember me now uses explicit right-aligned, full-width Arabic label/hint text and places the checkbox on the right. Row direction accounts for the native layout direction before and after RTL reload, avoiding double mirroring; English places the checkbox on the left. Added explicit `aria-checked` alongside native accessibility state so the web control correctly exposes its checked state. HTTP 502/530 now show a localized public-service reachability message rather than suggesting invalid login details or exposing a raw gateway response.

Verification: `npm test -- --reporter=dot` exited 0, 54 passed; `npm run typecheck` exited 0. `npx playwright test --config playwright.sdk-upgrade.config.ts --grep 'Arabic Remember me aligns'` exited 0, 1 passed. The isolated browser scenario verifies both Arabic text alignments, physical checkbox placement, toggling, a synthetic plain-text 530 response, and switching back to English. The initial visual test caught double-mirroring from inherited web RTL, and then missing web checkbox state; both were fixed before the final passing run. Native direction states are covered by the existing localization unit test; this is not a claim of physical-phone verification. Screenshot: `test-results/remember-me-ar.png`. No patient data or remote configuration was modified.

## Profile, calendar and Remember me verification — 1 November 2026

- `npm test -- --reporter=dot`: exit 0, **51 passed**. Added coverage for opt-in session persistence, token refresh without persistence, removal of an older remembered session, canonical-code-to-ID mapping, user-scoped condition requests and preservation of diagnosis identity/notes during date edits. Passwords and UserId are not added to stored sessions/mutation payloads respectively.
- `npm run typecheck`: exit 0.
- `npm run test:sdk-upgrade`: exit 0, **6 browser tests passed** with real Expo rendering on loopback port 18083 and synthetic intercepted backend requests. Covers existing recommendation rendering/feedback/localization, registration and password-reset UI, DOB calendar browsing, saved versus available conditions, adding another supported condition, date editing, cancel/confirm removal, preserving unrelated and legacy records, Arabic RTL calendar interaction, and remembered/non-remembered login after reload.
- Visually inspected `test-results/profile-conditions-en.png` and `test-results/calendar-ar.png`. Screenshots now wait for the real launch splash to unmount and for transitions to finish. Earlier captures showed the splash/Modal fade rather than the target UI; these were replaced and the affected scenarios rerun successfully.
- Initial unit failure reused a consumed mock Response across two logins; fixed the fixture to return fresh responses. Initial profile browser assertion counted an expected localization-preference PATCH as a disease mutation; corrected the assertion to inspect disease mutations specifically. Final tests above pass without suppressing errors.
- No real account, diagnosis, production database or SMTP message was changed by these browser fixtures. Existing backend endpoints are reused; no replacement service, database migration, upload archive or alternate configuration was created.
- Additional SQL/auth management test was added to existing backend `SqlHttpTests.cs`. Its build succeeded under installed SDK `11.0.100-rc.3.26522.148`, but execution aborted because this machine currently lacks the project's .NET 9 runtime. No runtime roll-forward, authentication bypass or machine-level repair was used. This test is **not recorded as passed**. Native phone behavior and real-server writes remain unverified here.

## Recommendation layout and diagnostics — 3 November 2026

`npm run typecheck`: exit 0. `npm test`: exit 0, 57 passed. `npm run test:sdk-upgrade`: final exit 0, 13 passed (3.1m). An initial new icon-position regression failed (12 passed/1 failed) because web ignored the native direction style; explicit web dir fixed it. Final screenshots: test-results/recommendations-failed-ar.png and daily-completed-ar.png, visually inspected. At 360px, the new Arabic failure test checks a genuinely wrapped paragraph, right alignment, icon-left geometry and no horizontal overflow. It also verifies read-only refresh and that a failed retry is not erased by a successful status read.

UI now has compact tabs, one status card, collapsible explanations and plan details. Native Arabic Text/TextInput use logical start with RTL layout, addressing RN 0.88 iOS physical alignment mirroring; web uses dir plus right alignment. Actual iOS/Expo Go confirmation remains required. Optional backend failureCode/generationId metadata is supported with a generic old-server fallback. Deployment/network remediation is separate from these local fixture results; see backend docs/integration/INTEGRATION_TEST_RESULTS.md for 193 passing real FastAPI+SQL tests and Docker investigation evidence.
