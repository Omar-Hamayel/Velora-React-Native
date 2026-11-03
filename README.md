# VeLora existing mobile app

Existing Expo58/ReactNative0.88 app, with its original navigation/screens and visual style. en/ar localization and actual local ASP.NET recommendation/feedback integration are implemented. Overall readiness PARTIAL: browser E2E passes, native device/RTL and Arabic medical review remain.

Start with [local setup](LOCAL_END_TO_END_SETUP.md), [readiness](LOCALIZATION_READINESS.md), [API mapping](docs/MOBILE_API_MAPPING.md), [tests](MOBILE_LOCALIZATION_TEST_RESULTS.md) and [translation review](ARABIC_TRANSLATION_REVIEW.md).

`npm ci`, then configure EXPO_PUBLIC_API_BASE_URL from .env.example. Use existing `npm start`/`npm run web`/`npm run android`; local exported web tests use explicit loopback settings. `npm run typecheck`, `npm test`, `npx playwright test` (requires synthetic local fixture variable/services). No FastAPI URL or private service secret belongs in the mobile bundle.

Language is presentation-only. IDs,codes,units,health payloads,ranking and fingerprints are unchanged. No Stage19,ML,production migration or deployment has started.

## SDK 58 upgrade — 31 October 2026

Current Expo SDK 58.0.22/React Native 0.88.1/React19.3.0. See [upgrade evidence](SDK58_UPGRADE.md). Typecheck,42 existing tests,2 SDK browser smoke tests,20 Expo Doctor checks and all-platform JS exports pass. Restart Metro with `npm run web -- --port 18082 --localhost --clear`; rebuild custom development clients for SDK58. Native installed-app/device checks remain outstanding.

## Profile, dates and sign-in — 1 November 2026

The profile now has a **My health conditions** section. It reads the authenticated user's `/api/User/UserDisease` records separately from the shared catalog, marks saved conditions, and offers the remaining supported choices. Add, edit diagnosis date and confirmed removal reuse the existing POST/PUT/DELETE routes. Older entries are shown for review and are never automatically converted into a specific diagnosis. No patient account was changed during development.

The shared date input now opens a month/year/day calendar on all platforms while keeping manual DD/MM/YYYY entry and ISO API dates. Sign-up uses the same control with its existing minimum-age restriction. **Remember me** is an explicit sign-in choice: unchecked sessions stay in memory, checked sessions use the existing session store, onboarding token refresh respects the choice, and passwords are never persisted. Existing stored sessions remain compatible. Profile sections use consistent spacing.

Verification: `npm test -- --reporter=dot` — 51 passed; `npm run typecheck` — exit 0; `npm run test:sdk-upgrade` — 6 passed against a loopback Metro at port 18083. Browser API calls are intercepted with synthetic data and do not reach production. Run that isolated server with `npm start -- --localhost --port 18083`; `VELORA_PRESENTATION_URL` optionally selects a different test origin. Native Expo Go touch/keyboard checks and real-server write verification remain separate from the demonstrated browser tests.

## Daily plan update — 3 November 2026

Home now separates remaining/completed tasks and owned paged history, with completion undo and update timestamps. Daily/profile-versioned generation uses durable post-commit jobs, time-zone-aware day boundaries, debounce and bounded retries. Stale plans are hidden. Completion is a cooldown exclusion; Like is a ranking signal. Backend schema migration and the coordinated Python/backend update are required before using the new mobile flow. See the backend `docs/integration/DAILY_RECOMMENDATION_LIFECYCLE.md`. Historical baseline notes above describe their original verification dates. No production migration/deployment was performed.
