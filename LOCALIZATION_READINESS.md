# Localization readiness

Date: 26 October 2026 (Asia/Hebron). **Overall PARTIAL.** The actual existing Expo app is now available at D:/Velora-React-Native-main. Its browser English and Arabic registration-to-feedback flows passed against the existing ASP.NET application, private FastAPI and a new synthetic SQL Server database. Browser RTL passed. Native Android/iOS JavaScript export passed, but no connected device or configured Android AVD was available; no native device/RTL success is claimed. All 40 recommendation translations and 30 reason translations are drafts requiring medical/human review.

## 1 Current localization architecture

The same three projects are used. The mobile folder is an existing source archive without .git, not a replacement project. Backend already had extensive uncommitted changes; those were preserved. Before changes, mobile source/assets were backed up with SHA256 manifest in mobile-evidence/mobile-before.zip and mobile-before-sha256.json. Backend private DTOs, frozen artifacts, and Python engine/catalog hashes were captured and verified unchanged. No backend/Python executable source, database model or migration was changed for this mobile task. No Stage 19 or ML work began.

Existing navigation is App.tsx's screen state and bubble/swipe animation, not Expo Router/React Navigation. Screens are Onboarding (intro), Welcome (login), SignUp, HealthInfo (body/lifestyle/disease/family history), Home, Profile, LabResults, BloodPressure and Medication. Existing component/style architecture remains. Home's invented static recommendation cards, completion toggles and fixed wellness percentage were replaced with persisted backend recommendations. Existing inert Plan/Progress/settings rows remain follow-up work; no extra screens were invented.

Localization lives in mobile src/localization/{core.ts,runtime.ts,preferences.ts,locales/en.json,locales/ar.json}. Existing AsyncStorage stores the session and a separate language selection. i18next/react-i18next handle rendering; expo-localization detects device language; conditional native I18nManager behavior and an explicit restart action handle direction. A narrow web/native video component fixes a demonstrated unhandled browser play() promise when a loading overlay unmounted; original branding/videos remain.

## 2 Canonical identifiers

Stable IDs remain diet_001–010, exercise_001–010, habits_001–010 and wellness_001–010. Reasons remain the actual 30 uppercase codes, including BASE_PROFILE_MATCH and four UNSAFE_FOR_* codes. Frozen category values Diet, Exercise, Daily Habits and Wellness are translated only at display time. Feedback targets the owned numeric recommendation row ID and retains the catalog ID on stored snapshots.

Mobile conditions are type_2_diabetes, hypertension, hypercholesterolemia and insulin_resistance. The actual authenticated GET /api/Admin/Disease provides Code→numeric ID. No ID-order, English name or Arabic label guessing remains. Only available canonical rows appear in current-diagnosis selection. Generic legacy_diabetes/legacy_dyslipidemia never imply Type 2 Diabetes/hypercholesterolemia. Missing/duplicate exact code mappings are blocked visibly, not guessed. Catalog policy for generic diagnoses is still a product/medical decision.

Backend activity codes 1..5 and stress 1..3 remain explicit. UI labels never become values. Actual Gender supports Male/Female; unsupported Other was removed from registration. FamilyRelation uses Father/Mother strings accepted by the existing converter, fixing the original reversed ordinal assumption. There is no existing mobile goals screen, so none was created; the existing backend Goal API is documented as available but currently unwired. Never use UI text as future ML labels.

## 3 PreferredLanguage storage

Backend Users.PreferredLanguage and existing GET/PATCH /api/User/User/preferences remain unchanged, exact en/ar only, JWT-owned and usable before onboarding. Language selection exists in Welcome and the existing Profile settings area. Local manual choice overrides device language and, when signed in, is PATCHed to the account. Without a manual choice, an existing account preference is used after login; otherwise the initial device Arabic locale selects ar and other locales select en. Sync failure retains the local choice and offers retry; reconnect/sign-in also retries. No language value is sent in health or private AI requests.

The existing AsyncStorage session approach was retained. Startup validates it via the authenticated onboarding status endpoint, resumes incomplete onboarding rather than always opening Home, and clears storage on 401. The refreshed JWT from completed onboarding is saved. Login to another account no longer carries the previous account's demographic display fields. Production token-storage hardening remains a separate review, not an undocumented storage redesign.

## 4 Backend responsibilities and actual API mapping

Backend persists profile data, authenticates ownership, normalizes inputs, calls FastAPI, validates/persists the AI snapshot and exposes reads/feedback. Mobile sends no trusted UserId. The mapper/request builder/ranker/fingerprint and all frozen DTOs were unchanged. Incomplete body/lifestyle saves use the existing onboarding step endpoints. Finalization supplies actual disease IDs and persists the returned JWT. Optional family history follows finalization because its existing controller requires ProfileCompleted. If optional family history fails after finalization, the profile/recommendations remain saved and retry is explicit; no rollback is claimed.

No backend endpoint was added. Detailed route/method/payload/auth mapping is in mobile docs/MOBILE_API_MAPPING.md. Existing goals API is available but there is no goals form in this app. The former hosted API constant was removed; EXPO_PUBLIC_API_BASE_URL is central. Android emulator uses the host alias 10.0.2.2, browser/iOS simulator can use 127.0.0.1, and physical-device development needs an explicit LAN origin. Release URLs require HTTPS; local exported-web tests have an explicit loopback-only HTTP opt-in. No credential/query/fragment URLs are allowed.

## 5 AI responsibilities and frozen Stage 18

Python app modules, catalog, Pydantic contract and OpenAPI were untouched. Stage 18 source/mirror check passed; full Python225 and .NET152 passed, including independent Stage 18 reruns55/85. No language or translationKey field was added to the frozen request/response. Score remains a relative ranking score and is not displayed as clinical confidence. Mobile calls ASP.NET only, never FastAPI. Runtime weather remains the previously documented optional context fallback; no live provider was added or claimed.

## 6 Mobile responsibilities and required screens

Existing functional screen labels, form choices, medical units, loading/empty/error states, feedback actions and settings use structured resource keys. Native Text/TextInput alignment is shared; layout margins/padding/positioning use logical start/end; directional arrows/swipe-back follow the selected language. Names/passwords/medication notes remain user input. Arabic/Persian digits and the Arabic decimal separator normalize to ordinary numeric values before JSON conversion; arbitrary units/letters/grouping are never silently stripped or converted. Units remain cm/kg, mg/dL, HbA1c %, mmHg and insulin µIU/mL.

## 7 Recommendation translation strategy

Resources contain all40 actual English title/description pairs and40 Arabic draft pairs, using recommendations.<catalogId>.title/description. Actual English values match the unchanged source catalog, verified by integrity-check.json. Unknown/legacy IDs fall back to stored snapshot text. No new recommendation or clinical rule was invented. ARABIC_TRANSLATION_REVIEW.md lists every ID, English/Arabic title and NEEDS_MEDICAL_REVIEW status; descriptions also require review. Python's earlier portable localization assets remain review placeholders and are not loaded by mobile; the actual integrated presentation assets are the mobile resources.

## 8 Reason-code translation strategy

All30 actual reason codes have English/Arabic display templates. Canonical stored/wire codes remain untouched. Unknown codes are not printed as technical labels. Reasons describe rule/ranking influences without promising a diagnosis, treatment or clinical confidence. All reason templates require review, including safety/caution families. Rejected recommendations never become visible merely because a translation exists.

## 9 Dynamic explanation strategy

Known reason_codes produce localized text. Unknown codes or absent structured reasons retain the stored English explanation under a localized 'Additional explanation (English)' label. Per-item exact matched feature/context metadata is not present in the frozen response, so exact historical condition/goal/measurement-based reconstruction is not claimed. No English free-text parsing influences identity, feedback, ranking or safety. Caution remains visibly distinct from safe advice.

## 10 RTL strategy

Browser html dir/lang and root logical direction switch en/LTR↔ar/RTL. Headless Edge430×932 screenshots and both full flows verified mirrored navigation/header/cards and localized text. Native runtime changes allowRTL/forceRTL conditionally, reverses them for English, and persists language before explicit reload. No permanent RTL flag is configured. Installed Expo54 plugin/native source was inspected; static supportsRTL/forcesRTL flags were omitted because they can reset runtime preferences on startup. Supported native locales en/ar are declared and verified by expo config introspection. Android/iOS JS exports passed; actual native UI, restart behavior, narrow devices, keyboard/bidi and Expo Go limitations remain unverified. Expo Go resets RTL preferences; use an existing development/native build for final device checks.

## 11 Future ML dataset rules

RecommendationCatalogId, condition codes, goal/activity/gender mappings, reason codes, feedback and medical units remain canonical. Translated text and PreferredLanguage must not become health features, targets or ranking inputs. Language switching produced no new batch/history insert/fingerprint change in actual SQL-backed UI flows. The English and Arabic synthetic users entered the same health values, and actual SQL values were identical. No dataset, training, hybrid fusion tuning or Stage19 task was started.

## 12 Known limitations and acceptance

Overall localization PARTIAL: mobile infrastructure/integration and browser English/Arabic E2E are working; native device verification and bilingual/medical review remain. No device is attached and emulator -list-avds returned no configured AVD. Production migration/deployment was not attempted. General UI copy is READY_FOR_REVIEW; medical catalog/reason wording is NEEDS_MEDICAL_REVIEW, none REVIEWED. Existing external email delivery was not exercised: the exact normal registration/Identity confirmation/login code used a loopback SMTP sink with synthetic addresses and real confirmation tokens. No auth or certificate check was disabled. Local fixture SMTP uses plaintext only on loopback via existing environment configuration, never real credentials/recipients.

Read LOCAL_END_TO_END_SETUP.md, MOBILE_LOCALIZATION_TEST_RESULTS.md, LOCAL_E2E_TEST_RESULTS.md and LOCALIZATION_GAPS.md for commands, evidence and precise limits. Prior preparation evidence is retained in LOCALIZATION_TEST_RESULTS.md and mobile-evidence/prior-LOCALIZATION_READINESS.md; its earlier 'mobile unavailable' statement is historical and superseded here.
