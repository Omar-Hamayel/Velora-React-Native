# VeLora existing mobile app

Existing Expo54/ReactNative app, with its original navigation/screens and visual style. en/ar localization and actual local ASP.NET recommendation/feedback integration are implemented. Overall readiness PARTIAL: browser E2E passes, native device/RTL and Arabic medical review remain.

Start with [local setup](LOCAL_END_TO_END_SETUP.md), [readiness](LOCALIZATION_READINESS.md), [API mapping](docs/MOBILE_API_MAPPING.md), [tests](MOBILE_LOCALIZATION_TEST_RESULTS.md) and [translation review](ARABIC_TRANSLATION_REVIEW.md).

`npm ci`, then configure EXPO_PUBLIC_API_BASE_URL from .env.example. Use existing `npm start`/`npm run web`/`npm run android`; local exported web tests use explicit loopback settings. `npm run typecheck`, `npm test`, `npx playwright test` (requires synthetic local fixture variable/services). No FastAPI URL or private service secret belongs in the mobile bundle.

Language is presentation-only. IDs,codes,units,health payloads,ranking and fingerprints are unchanged. No Stage19,ML,production migration or deployment has started.
