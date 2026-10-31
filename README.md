# VeLora existing mobile app

Existing Expo58/ReactNative0.88 app, with its original navigation/screens and visual style. en/ar localization and actual local ASP.NET recommendation/feedback integration are implemented. Overall readiness PARTIAL: browser E2E passes, native device/RTL and Arabic medical review remain.

Start with [local setup](LOCAL_END_TO_END_SETUP.md), [readiness](LOCALIZATION_READINESS.md), [API mapping](docs/MOBILE_API_MAPPING.md), [tests](MOBILE_LOCALIZATION_TEST_RESULTS.md) and [translation review](ARABIC_TRANSLATION_REVIEW.md).

`npm ci`, then configure EXPO_PUBLIC_API_BASE_URL from .env.example. Use existing `npm start`/`npm run web`/`npm run android`; local exported web tests use explicit loopback settings. `npm run typecheck`, `npm test`, `npx playwright test` (requires synthetic local fixture variable/services). No FastAPI URL or private service secret belongs in the mobile bundle.

Language is presentation-only. IDs,codes,units,health payloads,ranking and fingerprints are unchanged. No Stage19,ML,production migration or deployment has started.

## SDK 58 upgrade — 31 October 2026

Current Expo SDK 58.0.22/React Native 0.88.1/React19.3.0. See [upgrade evidence](SDK58_UPGRADE.md). Typecheck,42 existing tests,2 SDK browser smoke tests,20 Expo Doctor checks and all-platform JS exports pass. Restart Metro with `npm run web -- --port 18082 --localhost --clear`; rebuild custom development clients for SDK58. Native installed-app/device checks remain outstanding.
