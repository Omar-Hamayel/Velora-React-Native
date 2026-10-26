# Mobile files changed

Existing projects preserved. No new ASP.NET/FastAPI endpoints, schema, models or migrations were added for this mobile task. Backend executable source and private DTO/contract artifacts remain unchanged; only current documentation/README updates were added to the server projects. Mobile archive has no Git metadata, so comparison uses the pre-task ZIP/SHA256 manifest.

## Mobile (48 source/documentation files; this inventory is additional)

| File | Change |
|---|---|
|.env.example|Added to existing app|
|.gitignore|Modified existing|
|ARABIC_TRANSLATION_REVIEW.md|Added to existing app|
|App.tsx|Modified existing|
|LOCALIZATION_GAPS.md|Added to existing app|
|LOCALIZATION_READINESS.md|Added to existing app|
|LOCAL_E2E_TEST_RESULTS.md|Added to existing app|
|LOCAL_END_TO_END_SETUP.md|Added to existing app|
|MOBILE_LOCALIZATION_TEST_RESULTS.md|Added to existing app|
|README.md|Added to existing app|
|app.json|Modified existing|
|docs\MOBILE_API_MAPPING.md|Added to existing app|
|package-lock.json|Modified existing|
|package.json|Modified existing|
|playwright.config.ts|Added to existing app|
|src\api\authApi.ts|Modified existing|
|src\api\config.ts|Added to existing app|
|src\components\AnimatedLogo.tsx|Modified existing|
|src\components\BottomNav.tsx|Modified existing|
|src\components\BrandVideo.tsx|Added to existing app|
|src\components\BrandVideo.web.tsx|Added to existing app|
|src\components\DateInput.tsx|Modified existing|
|src\components\ErrorBanner.tsx|Modified existing|
|src\components\LabeledInput.tsx|Modified existing|
|src\components\LanguageSelector.tsx|Added to existing app|
|src\components\LoadingVideoOverlay.tsx|Modified existing|
|src\components\LocalizedText.tsx|Added to existing app|
|src\components\RecommendationList.tsx|Added to existing app|
|src\localization\core.ts|Added to existing app|
|src\localization\locales\ar.json|Added to existing app|
|src\localization\locales\en.json|Added to existing app|
|src\localization\preferences.ts|Added to existing app|
|src\localization\runtime.ts|Added to existing app|
|src\screens\BloodPressureScreen.tsx|Modified existing|
|src\screens\HealthInfoScreen.tsx|Modified existing|
|src\screens\HomeScreen.tsx|Modified existing|
|src\screens\LabResultsScreen.tsx|Modified existing|
|src\screens\MedicationScreen.tsx|Modified existing|
|src\screens\OnboardingScreen.tsx|Modified existing|
|src\screens\ProfileScreen.tsx|Modified existing|
|src\screens\SignUpScreen.tsx|Modified existing|
|src\screens\SplashVideoScreen.tsx|Modified existing|
|src\screens\WelcomeScreen.tsx|Modified existing|
|tests\api.test.ts|Added to existing app|
|tests\e2e\local-flow.spec.ts|Added to existing app|
|tests\localization.test.ts|Added to existing app|
|tests\runtime.test.ts|Added to existing app|
|vitest.config.ts|Added to existing app|

## Server/audit documentation

LOCALIZATION_READINESS.md and LOCALIZATION_GAPS.md updated; LOCAL_END_TO_END_SETUP.md, MOBILE_LOCALIZATION_TEST_RESULTS.md, LOCAL_E2E_TEST_RESULTS.md, ARABIC_TRANSLATION_REVIEW.md and MOBILE_API_MAPPING.md created/mirrored. Existing server READMEs and AI/localization/README.md link to current mobile evidence. Earlier generated AI localization placeholders remain unchanged.

Local-only .env.local contains public loopback test settings and is ignored. node_modules,dist,.expo,test-results and build caches are generated artifacts. One-time extraction/inspection scripts were moved to audit evidence, not shipped as repeatable source migrations. No original source/assets were deleted.
