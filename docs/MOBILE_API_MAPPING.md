# Mobile API mapping

All routes below were read from the existing controllers/DTOs; mobile calls the ASP.NET origin only. No new backend endpoints, solution, migration, Python schema or ranking changes were needed. Authenticated requests carry the verified login JWT; client payloads omit UserId.

| Existing route | Method | Auth | Mobile source/use | Mapping / limits |
|---|---|---|---|---|
|/api/Identity/Auth/register|POST|Anonymous|SignUp / register|fullName,email,password,confirmPassword,gender,dateOfBirth ISO date; real Unicode name validation; supported Male/Female only |
|/api/Identity/Auth/login|POST|Anonymous|Welcome / login|email,password; token/user stored in existing AsyncStorage; no token logs |
|/api/Identity/Auth/confirm-email|GET|Confirmation token|Email link / fixture|UserId,Token from real local SMTP email; confirmation required, never bypassed |
|/api/Identity/Auth/resend-confirmation-email|POST|Anonymous|SignUp/Welcome|email; localized success/error UI |
|/api/Identity/Auth/forgot-password|POST|Anonymous|Welcome|email; backend neutral response |
|/api/User/Onboarding/status|GET|JWT|App startup|RequiresProfileCompletion/NextStep; resume saved state |
|/api/User/Onboarding/body|POST|JWT|HealthInfo partial save|heightCm,weightKg,waistCircumferenceCm; no generation |
|/api/User/Onboarding/lifestyle|POST|JWT|HealthInfo partial save|numeric activity/stress, sleepHours,waterIntakeLitersPerDay,isSmoker; no generation |
|/api/User/Onboarding/complete|POST|JWT|HealthInfo Finish|nested body/lifestyle/diseases:{diseaseIds}; lookup actual IDs; stores refreshed token; backend owns automatic generation |
|/api/User/UserHealthProfile|GET|JWT|Profile/resume|read existing persisted row; no client-generated measurements |
|/api/User/UserHealthProfile/{id}|PUT|JWT|Profile edit|whole actual profile DTO; carries saved fields, blocks unknown stress enum rather than inventing Low |
|/api/Admin/Disease|GET|JWT, admin role not needed for read|condition catalog|Code→Id, never translated Name→Id; writes stay admin-only |
|/api/User/FamilyHistory|GET/POST|JWT+ProfileCompleted|optional after finalization|existing numeric diseaseId; relation Father/Mother string matches converter; skips exact saved pairs |
|/api/User/User/preferences|GET/PATCH|JWT, before onboarding allowed|language selector/session|{preferredLanguage:en/ar}; no health request or generation |
|/api/User/LabResult[/{id}]|GET/POST/PUT/DELETE|JWT+ProfileCompleted|existing LabResults|optional measured values omitted when unavailable; original mg/dL,%,µIU/mL; no fabricated zeros; HOMA-IR remains derived/read-only |
|/api/User/BloodPressureReading[/{id}]|GET/POST/PUT/DELETE|JWT+ProfileCompleted|existing BloodPressure|systolic/diastolic mmHg,pulse optional,known ISO date/notes |
|/api/User/Medication[/{id}]|GET/POST/PUT/DELETE|JWT+ProfileCompleted|existing Medication|existing free-text name/dose/frequency/relatedDisease/dates/notes; no medication advice generated |
|/api/AI/recommendations/latest|GET|JWT|Home / RecommendationList|existing persisted DTO id,recommendationCatalogId,category,title,description,reasonCodes,explanation,safetyStatus,feedback,isCompleted,generationId |
|/api/AI/recommendations/status|GET|JWT|Home status|actual status Pending/Generated/Failed;404 means no attempt; no nonexistent canRetry field assumed |
|/api/AI/recommendations/generate|POST|JWT|explicit retry only|no body/UserId; language changes and refresh never call it |
|/api/User/Recommendation/{id}/feedback|PATCH|JWT+ProfileCompleted|Home buttons|both exact feedback:liked/disliked/null and isCompleted:boolean required; preserves other state |
|/api/User/Goal[/{id}]|GET/POST/PUT/DELETE|JWT+ProfileCompleted|available, no form in archive|GoalType and target/current/deadline DTO; no duplicate goals endpoint or invented screen |

Private FastAPI routes remain GET /health, POST /recommendations. They are configured only in ASP.NET AiSettings, not in mobile. No profile names/email/token/password are sent to Python.

Client failures:0network;400/422validation;401clear session/relogin;403permission/profile gate;404missing;408/504timeout;500generic;503unavailable. User-visible text is localized and sanitized. The old registration behavior treating500 as successful account creation was removed; only successful responses advance. Mobile request timeout25s, no implicit write retries. Server AI failure states remain retryable without undoing the saved profile.

## Daily plan — 3 November 2026

Home now reads GET `/api/AI/recommendations/today` for metadata/current tasks/completedToday, and the existing GET `/api/AI/recommendations/my?skip=0&take=50` for paged history. Opening/foreground/day rollover explicitly POST `/api/AI/recommendations/ensure?timeZoneId=<device zone>` when needed; Refresh remains GET-only. Existing generate is explicit retry; existing feedback PATCH persists completion/undo and preferences. Never supply UserId from mobile. Deploy the matching backend/Python and additive migration before this mobile change.
