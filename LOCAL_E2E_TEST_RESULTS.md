# Local end-to-end test results

Date26 October2026. **English browser flow PASS; Arabic browser flow PASS; overall mobile localization PARTIAL pending native device/RTL and medical translation review.** These are real HTTP/UI/SQL tests using the existing Expo application compiled for web, normal Kestrel ASP.NET and unchanged private FastAPI. No mock recommendations, forged login tokens, auth bypass or manually confirmed SQL accounts were used.

Endpoints: browser127.0.0.1:18082→ASP.NET127.0.0.1:18081→private FastAPI127.0.0.1:18080. Local SMTP sink127.0.0.1:18025 receives synthetic email only. SQL: a new Velora_Mobile_<guid> LocalDB, whose exact name is in mobile-evidence/database.txt. Existing migration chain applied only there, exit0. The fixture's ports and credentials are test-only; production configuration/data was not modified.

| Check | English | Arabic | Evidence |
|---|---|---|---|
|Register with existing UI/API|PASS|PASS|real200,synthetic users |
|Receive/consume real confirmation token|PASS|PASS|normal EmailService→local SMTP→Identity confirm endpoint |
|Login and restore JWT session|PASS|PASS|normal password login/authenticated reads/reopen |
|Body/lifestyle incomplete save|PASS|PASS|SQL attempts0 after partial saves |
|Finish complete onboarding|PASS|PASS|nested disease-ID body,refreshed JWT |
|Automatic backend→FastAPI→SQL|PASS|PASS|Generated status,5 persisted safe/caution recommendations |
|Selected-language title/description/reasons|PASS|PASS|actual stable catalog keys and screenshots home-en.png/home-ar.png |
|Like and completion persist|PASS|PASS|real PATCH and subsequent read |
|Switch language|PASS|PASS|real preference PATCH; browser direction mirrored |
|No language-only new batch/hash/history|PASS|PASS|SQL attempt/count/hash identical before/after |
|Reopen retains selection/data/feedback|PASS|PASS|browser reload,authenticated latest same |
|Lab/BP/medication form localization|PASS|PASS|existing add forms; medical unit labels preserved |
|No mobile call to private AI|PASS|PASS|mobile source requests ASP.NET only; no mobile generate request during flow |
|No browser unhandled error|PASS|PASS|strict pageerror list empty after lifecycle fix |
|Native Android/iOS runtime|NOT VERIFIED|NOT VERIFIED|SDK present,no connected device/no AVD; exports only |

Actual normalized SQL body/lifestyle values for independently entered en/ar users are identical: height170cm,weight75kg,waist85cm,activity2,sleep8h,water2L/day,not smoking,stress1. Each final flow's SQL snapshot recorded1 generation attempt and5 recommendation rows; user-specific fingerprints are not compared across different user IDs, only before/after each user's language switch. SafetyStatus not safe/caution count0. No extra generation request is issued merely by refreshing or selecting a language.

Dislike/clear behavior is additionally covered in mobile API tests and the unchanged backend integration/regression suite. All existing server safety/multi-condition/weather/history/ownership/error suites remain green; browser testing uses hypertension and does not claim all medical combinations were manually exercised on devices.

Regression commands: D:/Velora/.venv/Scripts/python.exe -m pytest -q →225 passed,exit0; dotnet test Velora.sln --nologo with VELORA_TEST_AI_URL set →152 passed/0 failed/0 skipped,exit0. Independent Stage18 runs: tests/test_contract_v1.py55 passed and .NET --filter Stage=18 85 passed. export_contract.py --check --mirror backend docs/integration/contracts/v1 exit0. integrity-check.json confirms private DTOs/engine/catalog/artifacts unchanged. Mobile42 helpers+2 browser tests pass; typecheck and all-platform Expo export exit0.

See LOCAL_END_TO_END_SETUP.md for exact startup/reproduction, MOBILE_LOCALIZATION_TEST_RESULTS.md for failures/fixes and LOCALIZATION_GAPS.md for remaining acceptance limits. Existing public email templates/confirmation pages are still English; medical Arabic is unapproved draft. No production deployment or migration and no Stage19/ML work occurred.
