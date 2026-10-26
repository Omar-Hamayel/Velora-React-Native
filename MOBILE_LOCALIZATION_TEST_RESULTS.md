# Mobile localization test results

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
