import AsyncStorage from "@react-native-async-storage/async-storage";

// The backend is deployed on runasp.net (paired with the databaseasp.net
// hosted SQL Server), reachable from any device/network — no more
// localhost/LAN-IP/dev-certificate concerns.
const API_BASE_URL = "https://velora.runasp.net";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// In-memory copy, mirrored to AsyncStorage (see saveSession/loadPersistedSession
// /clearSession below) so a real login survives the app being closed and
// reopened, while an unconfirmed registration (token comes back empty) never
// gets persisted as a logged-in session.
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// Populated by register() (from the fields the user actually typed —
// gender/dateOfBirth aren't returned by any GET endpoint the backend
// exposes) and merged/refreshed by login() (which only returns
// userId/fullName/email, not gender/dob) — so gender/dateOfBirth are only
// ever known within the same app session they were entered in, and are
// simply omitted from display otherwise, even across a restored session.
export type CurrentUser = {
  userId: string;
  fullName: string;
  email: string;
  gender?: Gender;
  dateOfBirth?: string;
};

let currentUser: CurrentUser | null = null;

export function setCurrentUser(user: CurrentUser | null): void {
  currentUser = user;
}

export function getCurrentUser(): CurrentUser | null {
  return currentUser;
}

const SESSION_STORAGE_KEY = "velora_session";

type StoredSession = { token: string; user: CurrentUser };

async function saveSession(): Promise<void> {
  if (!authToken || !currentUser) return;
  const session: StoredSession = { token: authToken, user: currentUser };
  try {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Persisting is a nice-to-have on top of the in-memory session that's
    // already set — a storage failure here shouldn't block login/register.
  }
}

// Called once on app startup (during the splash screen, while content is
// still invisible, so there's no visible flicker either way). Returns true
// if a previous session was found and restored into memory.
export async function loadPersistedSession(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as StoredSession;
    if (!session.token || !session.user) return false;
    authToken = session.token;
    currentUser = session.user;
    return true;
  } catch {
    return false;
  }
}

// Used by the Log Out button — clears both the in-memory session and the
// persisted copy, so the next app launch lands back on the login screen.
export async function clearSession(): Promise<void> {
  authToken = null;
  currentUser = null;
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // In-memory state is already cleared, which is what the current app
    // session needs; a stale storage entry would just get overwritten by
    // the next successful login anyway.
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Tries the common ASP.NET Core error shapes (ProblemDetails / ModelState
// validation errors, or a plain { message } / { error }) and falls back to a
// generic message keyed off the HTTP status when none of them match.
function extractErrorMessage(data: unknown, response: Response): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.errors && typeof obj.errors === "object") {
      // Show every field's validation message, not just the first one — a
      // single bad field previously hid the rest of the picture (e.g. a DTO
      // rejecting several fields at once only ever surfaced the first).
      const allMessages = Object.values(obj.errors as Record<string, unknown>).flatMap((v) =>
        Array.isArray(v) ? v.filter((m): m is string => typeof m === "string") : []
      );
      if (allMessages.length > 0) return allMessages.join(" ");
    }
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.title === "string") return obj.title;
    if (typeof obj.error === "string") return obj.error;
  }
  return `Request failed (${response.status})`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "Couldn't reach the server. Check your connection and the API address.",
      0
    );
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, response), response.status);
  }
  return data as T;
}

export type Gender = "female" | "male" | "other";

// Field names are camelCase to match ASP.NET Core's default JSON policy.
// Adjust these to match your actual DTOs if they differ.
export type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: Gender;
  dateOfBirth: string; // ISO "YYYY-MM-DD"
};

export type RegisterResponse = {
  message?: string;
  userId?: string;
  fullName?: string;
  email?: string;
} & Record<string, unknown>;

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const result = await request<RegisterResponse>("/api/Identity/Auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  // Registration succeeds before the email is confirmed (token comes back
  // empty), so this is stored from what was actually typed, not re-fetched.
  setCurrentUser({
    userId: result.userId ?? "",
    fullName: payload.fullName,
    email: payload.email,
    gender: payload.gender,
    dateOfBirth: payload.dateOfBirth,
  });
  return result;
}

// Normally reached by the user tapping the link in their confirmation email
// (which hits this endpoint directly), not by the app itself. Exposed here
// in case you want an in-app "enter confirmation link" fallback or deep-link
// handler later.
export function confirmEmail(userId: string, token: string): Promise<unknown> {
  const query = `UserId=${encodeURIComponent(userId)}&Token=${encodeURIComponent(token)}`;
  return request(`/api/Identity/Auth/confirm-email?${query}`, { method: "GET" });
}

export function resendConfirmationEmail(email: string): Promise<unknown> {
  return request("/api/Identity/Auth/resend-confirmation-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function forgotPassword(email: string): Promise<unknown> {
  return request("/api/Identity/Auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export type LoginRequest = { email: string; password: string };

// nextStep is a string naming the next required step ("BodyInformation",
// "Diseases"), not a number — confirmed by a real login response. It can
// also come back null once Body Info is done but the backend has no single
// named step left to report (e.g. mid-way through Diseases/FamilyHistory).
// Treating it as a number (the original assumption) always produced NaN and
// silently defaulted to step 1, no matter the real progress.
export type LoginResponse = {
  token: string;
  userId: string;
  fullName: string;
  email: string;
  requiresProfileCompletion: boolean;
  nextStep?: string | null;
};

// Maps the backend's named step to this app's 3-step UI (Body+Lifestyle
// merged into step 1/2, Diseases+FamilyHistory merged into step 3).
export function mapNextStepToUiStep(nextStep: string | null | undefined): 1 | 2 | 3 {
  if (nextStep === "BodyInformation") return 1;
  // null/"Diseases"/anything else all mean Body Info is already done, and
  // this app's merged Diseases+FamilyHistory screen covers everything past
  // that point, so they all resolve to step 3.
  return 3;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const result = await request<LoginResponse>("/api/Identity/Auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAuthToken(result.token);
  // Merge rather than overwrite: gender/dateOfBirth (only ever known from a
  // register() call earlier in this same app session) would otherwise be
  // wiped out by a login response that doesn't include them at all.
  setCurrentUser({
    ...currentUser,
    userId: result.userId,
    fullName: result.fullName,
    email: result.email,
  });
  await saveSession();
  return result;
}

// ---------------------------------------------------------------------------
// Mandatory onboarding steps (gate access to Home). UserId is never sent
// explicitly — the backend derives it from the JWT attached by `request()`.
// ---------------------------------------------------------------------------

// ActivityLevel and StressLevel are `int` columns in the DB. Sending them as
// PascalCase strings (matching Gender's accepted format) caused the whole
// request body to fail JSON deserialization ("The dto field is required." —
// ASP.NET Core's generic fallback when any single property can't convert),
// so unlike Gender, these two do NOT tolerate string values — they need real
// integers. Confirmed 1-indexed via a real authenticated PUT call that
// echoed each code's real label back: 1=Sedentary, 2=LightlyActive,
// 3=ModeratelyActive, 4=VeryActive, 5=ExtraActive for ActivityLevel;
// 1=Low, 2=Moderate, 3=High for StressLevel. Code 0 is rejected outright
// ("Invalid activity/stress level.") — the previous 0-indexed mapping meant
// picking "Sedentary" would hard-fail, and every other selection silently
// saved one tier below what the user actually picked, with no validation
// error to catch it (any in-range int passes).
export type ActivityLevel = "Sedentary" | "Light" | "Moderate" | "Active" | "VeryActive";
export type StressLevel = "Low" | "Medium" | "High";

const ACTIVITY_LEVEL_CODES: Record<ActivityLevel, number> = {
  Sedentary: 1,
  Light: 2,
  Moderate: 3,
  Active: 4,
  VeryActive: 5,
};

const STRESS_LEVEL_CODES: Record<StressLevel, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

// Body Information (onboarding step 1) and Lifestyle (step 2) both persist
// into the same UserHealthProfile table, and the endpoint validates the
// whole record at once — submitting step 1's fields alone got rejected for
// missing step 2 fields ("Smoking status is required."). So this is sent as
// a single combined request after both steps are filled in, not two partial
// ones. Field names confirmed directly against the table schema (HeightCm,
// WeightKg, WaistCircumferenceCm, WaterIntakeLitersPerDay columns), except
// IsSmoker, which is confirmed PascalCase specifically (unlike every other
// field here) since camelCase "isSmoker" was tried and rejected.
export type BodyInfoRequest = {
  heightCm: number;
  weightKg: number;
  waistCircumferenceCm: number;
  activityLevel: ActivityLevel;
  sleepHours: number;
  waterIntakeLitersPerDay: number;
  isSmoker: boolean;
  stressLevel: StressLevel;
};

function buildUserHealthProfileBody(payload: BodyInfoRequest) {
  const { isSmoker, activityLevel, stressLevel, ...rest } = payload;
  return {
    ...rest,
    IsSmoker: isSmoker,
    activityLevel: ACTIVITY_LEVEL_CODES[activityLevel],
    stressLevel: STRESS_LEVEL_CODES[stressLevel],
  };
}

export function submitBodyInfo(payload: BodyInfoRequest): Promise<unknown> {
  return request("/api/User/UserHealthProfile", {
    method: "POST",
    body: JSON.stringify(buildUserHealthProfileBody(payload)),
  });
}

// GET returns the string enum names directly (e.g. "ModeratelyActive"), not
// the numeric codes POST expects — confirmed via a real authenticated call.
// It comes back as an array (one entry per user in practice); the most
// recently created/updated one is used in case more than one exists.
export type UserHealthProfileRecord = {
  id: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
  waistCircumferenceCm: number;
  activityLevel: string;
  sleepHours: number;
  stressLevel: string;
  isSmoker: boolean;
  waterIntakeLitersPerDay: number;
};

export async function getUserHealthProfile(): Promise<UserHealthProfileRecord | null> {
  const list = await request<UserHealthProfileRecord[]>("/api/User/UserHealthProfile", {
    method: "GET",
  });
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[list.length - 1];
}

// Reverse of ACTIVITY_LEVEL_CODES/STRESS_LEVEL_CODES — maps the backend's
// returned label back to this app's friendly ActivityLevel/StressLevel type,
// for pre-filling an edit form from a GET response.
const ACTIVITY_LEVEL_FROM_LABEL: Record<string, ActivityLevel> = {
  Sedentary: "Sedentary",
  LightlyActive: "Light",
  ModeratelyActive: "Moderate",
  VeryActive: "Active",
  ExtraActive: "VeryActive",
};

const STRESS_LEVEL_FROM_LABEL: Record<string, StressLevel> = {
  Low: "Low",
  Moderate: "Medium",
  High: "High",
};

export function activityLevelFromLabel(label: string): ActivityLevel | null {
  return ACTIVITY_LEVEL_FROM_LABEL[label] ?? null;
}

export function stressLevelFromLabel(label: string): StressLevel | null {
  return STRESS_LEVEL_FROM_LABEL[label] ?? null;
}

// Confirmed via a real authenticated call: POST refuses with "A health
// profile already exists for this user. Use update instead." once one
// exists, and PUT on the bare collection route returns 405 — the real
// update route needs the record's own id appended.
export function updateUserHealthProfile(id: number, payload: BodyInfoRequest): Promise<unknown> {
  return request(`/api/User/UserHealthProfile/${id}`, {
    method: "PUT",
    body: JSON.stringify(buildUserHealthProfileBody(payload)),
  });
}

export type DiseaseType = "diabetes" | "hypertension" | "dyslipidemia" | "insulinResistance";

// UserDisease (and FamilyHistory below, which also references diseases)
// identify diseases by a numeric DiseaseId — a foreign key into a lookup
// table — not by name. Confirmed by the live API rejecting a plain disease
// string with "DiseaseId must be a positive number." The exact ID-per-disease
// mapping isn't confirmed, only that IDs are positive integers; this assumes
// natural declaration order starting at 1.
const DISEASE_ID_CODES: Record<DiseaseType, number> = {
  diabetes: 1,
  hypertension: 2,
  dyslipidemia: 3,
  insulinResistance: 4,
};

export type DiseasesRequest = { diseases: DiseaseType[] };

// Neither a nested array of { diseaseId } objects nor a flat array of
// integers worked — both sent genuinely positive IDs (confirmed by directly
// capturing the outgoing request each time), but the server rejected both
// the same way. The error names "DiseaseId" specifically (singular), and the
// table schema is one UserId+DiseaseId pair per row, so this endpoint most
// likely creates one record per call rather than accepting a batch. Fire one
// request per selected disease instead of wrapping them in an array.
export async function submitDiseases(payload: DiseasesRequest): Promise<unknown> {
  // IsDiagnosed is also required (separate from DiagnosisDate/Notes, which
  // are nullable). Selecting a condition in "Do you currently have any of
  // these conditions?" is the user affirmatively stating they have it, so
  // that's reported as formally diagnosed rather than just suspected.
  // Sent as PascalCase specifically — camelCase "isDiagnosed" was tried and
  // rejected, same inconsistent-casing behavior already seen with IsSmoker.
  //
  // Sequential, not Promise.all: firing all disease requests concurrently
  // got a 405 back from this host — budget hosting tiers often can't handle
  // concurrent requests to the same endpoint cleanly. One at a time is
  // slower but far more reliable, and pinpoints exactly which disease fails
  // if one still does.
  const results: unknown[] = [];
  for (const disease of payload.diseases) {
    const result = await request("/api/User/UserDisease", {
      method: "POST",
      body: JSON.stringify({ diseaseId: DISEASE_ID_CODES[disease], IsDiagnosed: true }),
    });
    results.push(result);
  }
  return results;
}

export type FamilyRelation = "mother" | "father";

// Relation is also an `int` column (confirmed via the FamilyHistory table
// schema), not a string — same class of mismatch as ActivityLevel/StressLevel.
// Started at 0 originally and got "invalid relation" back — DiseaseId also
// required a *positive* number (rejecting 0), so this follows the same
// 1-indexed convention instead. Adjust if the server's actual order differs.
const RELATION_CODES: Record<FamilyRelation, number> = {
  mother: 1,
  father: 2,
};

export type FamilyHistoryEntry = { disease: DiseaseType; relation: FamilyRelation };

export type FamilyHistoryRequest = { entries: FamilyHistoryEntry[] };

// Same reasoning as submitDiseases: one FamilyHistory row is one
// disease+relation pair, so this is sent as one call per entry rather than
// a batched array — sequentially, for the same concurrency-reliability
// reason.
export async function submitFamilyHistory(payload: FamilyHistoryRequest): Promise<unknown> {
  const results: unknown[] = [];
  for (const entry of payload.entries) {
    const result = await request("/api/User/FamilyHistory", {
      method: "POST",
      body: JSON.stringify({
        diseaseId: DISEASE_ID_CODES[entry.disease],
        relation: RELATION_CODES[entry.relation],
      }),
    });
    results.push(result);
  }
  return results;
}

// Reads onboarding/profile-completion status. Confirmed GET-only — POST and
// PUT both got a clean 405 (well-formed request, method genuinely not
// allowed) while GET got 401 (valid route/method, just needs auth).
export function getProfileCompletionStatus(): Promise<unknown> {
  return request("/api/User/ProfileCompletion", { method: "GET" });
}

// The actual "mark onboarding complete" action — a separate route from
// ProfileCompletion above, discovered by probing method/route combinations
// (POST here returned 401 "needs auth", confirming the route+verb are real,
// while PATCH/PUT on it returned 405). Without calling this, the backend
// keeps returning requiresProfileCompletion: true on every future login even
// after all step data (body/lifestyle/diseases/family history) has been
// submitted — confirmed by a user whose account got stuck exactly that way.
//
// Confirmed via a real authenticated call: this endpoint's DTO is nested —
// { body: { heightCm, weightKg, waistCircumferenceCm }, lifestyle: {
// IsSmoker, sleepHours, stressLevel, activityLevel } } — not a flat object
// like UserHealthProfile. Found by reading the validation error keys
// themselves ("Body.HeightCm", "Lifestyle.IsSmoker", etc.) once a real token
// made a genuine validation response possible instead of a routing-only one.
// IsSmoker keeps its established PascalCase requirement; the rest match
// UserHealthProfile's camelCase + numeric enum codes. waterIntakeLitersPerDay
// isn't part of this DTO at all (confirmed — omitting it still succeeds).
export function completeOnboarding(payload: BodyInfoRequest): Promise<unknown> {
  const body = {
    body: {
      heightCm: payload.heightCm,
      weightKg: payload.weightKg,
      waistCircumferenceCm: payload.waistCircumferenceCm,
    },
    lifestyle: {
      IsSmoker: payload.isSmoker,
      sleepHours: payload.sleepHours,
      stressLevel: STRESS_LEVEL_CODES[payload.stressLevel],
      activityLevel: ACTIVITY_LEVEL_CODES[payload.activityLevel],
    },
  };
  return request("/api/User/Onboarding/Complete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Optional health records (filled in later from Home/Profile, not part of
// the onboarding gate). Unlike UserHealthProfile (one row per user), these
// three are each a history log — multiple records per user, each with its
// own id — confirmed via real authenticated GET/POST/PUT calls, all
// following the same /api/User/{Entity}[/{id}] pattern.
// ---------------------------------------------------------------------------

// At least one measurement field is required (confirmed: an empty body
// returns "At least one lab measurement must be provided."). homaIr is
// computed server-side from fastingGlucose+fastingInsulin — sending it under
// any of a dozen tried casings/names never bound, and it turned out to
// auto-populate correctly once both of those two were provided, confirming
// it's read-only, not an input.
export type LabResultRequest = {
  hbA1c?: number;
  fastingGlucose?: number;
  randomGlucose?: number;
  ogtt?: number;
  totalCholesterol?: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  fastingInsulin?: number;
  testDate?: string; // ISO "YYYY-MM-DD"
};

export type LabResultRecord = LabResultRequest & {
  id: number;
  homair: number | null;
  createdAt: string;
  updatedAt: string | null;
};

export function submitLabResult(payload: LabResultRequest): Promise<LabResultRecord> {
  return request("/api/User/LabResult", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateLabResult(
  id: number,
  payload: LabResultRequest
): Promise<LabResultRecord> {
  return request(`/api/User/LabResult/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getLabResults(): Promise<LabResultRecord[]> {
  return request("/api/User/LabResult", { method: "GET" });
}

export function deleteLabResult(id: number): Promise<void> {
  return request(`/api/User/LabResult/${id}`, { method: "DELETE" });
}

// Systolic/diastolic are required (confirmed ranges: 50-300 / 30-200 mmHg);
// pulse/measuredAt/notes are optional.
export type BloodPressureReadingRequest = {
  systolic: number;
  diastolic: number;
  pulse?: number;
  measuredAt?: string; // ISO "YYYY-MM-DD"
  notes?: string;
};

export type BloodPressureReadingRecord = BloodPressureReadingRequest & {
  id: number;
  createdAt: string;
  updatedAt: string | null;
};

export function submitBloodPressureReading(
  payload: BloodPressureReadingRequest
): Promise<BloodPressureReadingRecord> {
  return request("/api/User/BloodPressureReading", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBloodPressureReading(
  id: number,
  payload: BloodPressureReadingRequest
): Promise<BloodPressureReadingRecord> {
  return request(`/api/User/BloodPressureReading/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getBloodPressureReadings(): Promise<BloodPressureReadingRecord[]> {
  return request("/api/User/BloodPressureReading", { method: "GET" });
}

export function deleteBloodPressureReading(id: number): Promise<void> {
  return request(`/api/User/BloodPressureReading/${id}`, { method: "DELETE" });
}

// Only "name" is required; relatedDisease is a free-text string (confirmed —
// sending a numeric DiseaseId-style value was rejected, a plain string like
// "diabetes" was accepted), not a DiseaseId foreign key like UserDisease.
export type MedicationRequest = {
  name: string;
  dose?: string;
  frequency?: string;
  relatedDisease?: string;
  startDate?: string; // ISO "YYYY-MM-DD"
  endDate?: string; // ISO "YYYY-MM-DD"
  notes?: string;
};

export type MedicationRecord = MedicationRequest & {
  id: number;
  createdAt: string;
  updatedAt: string | null;
};

export function submitMedication(payload: MedicationRequest): Promise<MedicationRecord> {
  return request("/api/User/Medication", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMedication(
  id: number,
  payload: MedicationRequest
): Promise<MedicationRecord> {
  return request(`/api/User/Medication/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getMedications(): Promise<MedicationRecord[]> {
  return request("/api/User/Medication", { method: "GET" });
}

export function deleteMedication(id: number): Promise<void> {
  return request(`/api/User/Medication/${id}`, { method: "DELETE" });
}