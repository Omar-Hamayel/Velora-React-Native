import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./config";
import { translate, type Language } from "../localization/core";

const API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL, Platform.OS, __DEV__, process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === "true");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;
let rememberSession = false;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

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

type StoredSession = { token: string; user: CurrentUser; rememberMe?: boolean };

async function saveSession(): Promise<void> {
  if (!authToken || !currentUser) return;
  const session: StoredSession = { token: authToken, user: currentUser, rememberMe: true };
  try {
    if (rememberSession) await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
  }
}

export async function loadPersistedSession(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as StoredSession;
    if (!session.token || !session.user || session.rememberMe === false) return false;
    authToken = session.token;
    currentUser = session.user;
    rememberSession = true;
    return true;
  } catch {
    return false;
  }
}

export async function clearSession(): Promise<void> {
  authToken = null;
  currentUser = null;
  rememberSession = false;
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function errorKey(status: number): string {
  if (status === 0) return "errors.network";
  if (status === 401) return "errors.session";
  if (status === 403) return "errors.forbidden";
  if (status === 404) return "errors.notFound";
  if (status === 400 || status === 422) return "errors.validation";
  if (status === 408 || status === 504) return "errors.timeout";
  if (status === 503) return "errors.unavailable";
  if (status === 502 || status === 530) return "errors.gateway";
  return "errors.server";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options, signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...(options.headers ?? {}) },
    });
    const text = await response.text();
    const data = text ? safeJsonParse(text) : null;
    if (!response.ok) {
      if (response.status === 401) await clearSession();
      const unconfirmed = path.endsWith("/login") && typeof (data as any)?.message === "string" && (data as any).message.includes("confirm your email");
      throw new ApiError(translate(unconfirmed ? "auth.confirmEmail" : errorKey(response.status)), response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(translate(controller.signal.aborted ? "errors.timeout" : "errors.network"), controller.signal.aborted ? 408 : 0);
  } finally { clearTimeout(timeout); }
}

export type Gender = "female" | "male";

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
  setCurrentUser({
    userId: result.userId ?? "",
    fullName: payload.fullName,
    email: payload.email,
    gender: payload.gender,
    dateOfBirth: payload.dateOfBirth,
  });
  return result;
}

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

export type LoginResponse = {
  token: string;
  userId: string;
  fullName: string;
  email: string;
  requiresProfileCompletion: boolean;
  nextStep?: string | null;
};

export function mapNextStepToUiStep(nextStep: string | null | undefined): 1 | 2 | 3 {
  return nextStep === "Diseases" ? 3 : nextStep === "Lifestyle" ? 2 : 1;
}

export async function login(payload: LoginRequest, options: { rememberMe?: boolean } = {}): Promise<LoginResponse> {
  const result = await request<LoginResponse>("/api/Identity/Auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAuthToken(result.token);
  rememberSession = options.rememberMe ?? true;
  const previous = currentUser?.email === result.email ? currentUser : null;
  setCurrentUser({
    ...previous,
    userId: result.userId,
    fullName: result.fullName,
    email: result.email,
  });
  await saveSession();
  return result;
}


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

export async function submitBodyInfo(payload: BodyInfoRequest): Promise<unknown> {
  const body = onboardingBody(payload, []);
  await request("/api/User/Onboarding/body", {method: "POST", body: JSON.stringify(body.body)});
  return request("/api/User/Onboarding/lifestyle", {method: "POST", body: JSON.stringify(body.lifestyle)});
}

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

export function updateUserHealthProfile(id: number, payload: BodyInfoRequest): Promise<unknown> {
  return request(`/api/User/UserHealthProfile/${id}`, {
    method: "PUT",
    body: JSON.stringify(buildUserHealthProfileBody(payload)),
  });
}

export type DiseaseType = "type_2_diabetes" | "hypertension" | "hypercholesterolemia" | "insulin_resistance";
export const SUPPORTED_CONDITIONS: { code: DiseaseType; label: string }[] = [
  {code:"type_2_diabetes",label:"screens.HealthInfo.type2Diabetes"},
  {code:"hypertension",label:"screens.HealthInfo.hypertension"},
  {code:"hypercholesterolemia",label:"screens.HealthInfo.hypercholesterolemia"},
  {code:"insulin_resistance",label:"screens.HealthInfo.insulinResistance"},
];
export type UserDiseaseRecord = {
  id: number; diseaseId: number; conditionCode: string | null; diseaseName: string;
  diagnosisDate: string | null; isDiagnosed: boolean; notes: string | null;
};
export function getUserDiseases(): Promise<UserDiseaseRecord[]> { return request("/api/User/UserDisease"); }
export async function addUserDisease(code: DiseaseType, diagnosisDate?: string): Promise<UserDiseaseRecord> {
  const [diseaseId] = await resolveDiseaseIds([code]);
  return request("/api/User/UserDisease", {method:"POST",body:JSON.stringify({diseaseId,isDiagnosed:true,diagnosisDate:diagnosisDate ?? null})});
}
export function updateUserDisease(record: UserDiseaseRecord, diagnosisDate?: string): Promise<UserDiseaseRecord> {
  return request(`/api/User/UserDisease/${record.id}`, {method:"PUT",body:JSON.stringify({diagnosisDate:diagnosisDate ?? null,isDiagnosed:record.isDiagnosed,notes:record.notes})});
}
export function removeUserDisease(id: number): Promise<void> { return request(`/api/User/UserDisease/${id}`, {method:"DELETE"}); }
export type DiseaseRecord = { id: number; code: string | null; name: string; description?: string };
export function getDiseaseCatalog(): Promise<DiseaseRecord[]> { return request("/api/Admin/Disease"); }
export async function resolveDiseaseIds(codes: DiseaseType[]): Promise<number[]> {
  const catalog = await getDiseaseCatalog();
  return codes.map(code => {
    const matches = catalog.filter(row => row.code === code);
    if (matches.length !== 1) throw new ApiError(translate("health.conditionUnavailable"), 400);
    return matches[0].id;
  });
}
export type DiseasesRequest = { diseases: DiseaseType[] };
export async function submitDiseases(payload: DiseasesRequest): Promise<unknown> {
  const ids = await resolveDiseaseIds(payload.diseases);
  return request("/api/User/Onboarding/diseases", { method: "POST", body: JSON.stringify({ diseaseIds: ids }) });
}
export type FamilyRelation = "mother" | "father";
export type FamilyHistoryEntry = { disease: DiseaseType; relation: FamilyRelation };
export type FamilyHistoryRequest = { entries: FamilyHistoryEntry[] };
export async function submitFamilyHistory(payload: FamilyHistoryRequest): Promise<unknown> {
  const codes = [...new Set(payload.entries.map(e => e.disease))];
  const ids = await resolveDiseaseIds(codes);
  const saved = await request<{ diseaseId: number; relation: string }[]>("/api/User/FamilyHistory");
  for (const entry of payload.entries) {
    const diseaseId = ids[codes.indexOf(entry.disease)];
    const relation = entry.relation === "mother" ? "Mother" : "Father";
    if (!saved.some(row => row.diseaseId === diseaseId && row.relation === relation))
      await request("/api/User/FamilyHistory", { method: "POST", body: JSON.stringify({ diseaseId, relation }) });
  }
  return undefined;
}

export function getProfileCompletionStatus(): Promise<unknown> {
  return request("/api/User/ProfileCompletion", { method: "GET" });
}

export function onboardingBody(payload: BodyInfoRequest, diseaseIds: number[]) {
  return { body: { heightCm: payload.heightCm, weightKg: payload.weightKg, waistCircumferenceCm: payload.waistCircumferenceCm },
    lifestyle: { isSmoker: payload.isSmoker, sleepHours: payload.sleepHours, waterIntakeLitersPerDay: payload.waterIntakeLitersPerDay,
      stressLevel: STRESS_LEVEL_CODES[payload.stressLevel], activityLevel: ACTIVITY_LEVEL_CODES[payload.activityLevel] },
    diseases: { diseaseIds } };
}
export async function completeOnboarding(payload: BodyInfoRequest, conditions: DiseaseType[] = []): Promise<LoginResponse> {
  const ids = await resolveDiseaseIds(conditions);
  const result = await request<LoginResponse>("/api/User/Onboarding/complete", { method: "POST", body: JSON.stringify(onboardingBody(payload, ids)) });
  setAuthToken(result.token);
  await saveSession();
  return result;
}

export function getOnboardingStatus(): Promise<{ requiresProfileCompletion: boolean; nextStep?: string | null }> { return request("/api/User/Onboarding/status"); }
export function getPreferences(): Promise<{preferredLanguage: Language}> { return request("/api/User/User/preferences"); }
export function updatePreferences(preferredLanguage: Language): Promise<{preferredLanguage: Language}> {
  return request("/api/User/User/preferences", { method: "PATCH", body: JSON.stringify({preferredLanguage}) });
}
export type RecommendationRecord = {
  id: number; recommendationCatalogId: string | null; title: string; description: string; category: string | null;
  reasonCodes: string[]; explanation: string | null; safetyStatus: string | null; score: number | null;
  feedback: "liked" | "disliked" | null; isCompleted: boolean; generationId: string;
  generatedAt?: string; completedAt?: string | null; recurrence?: "daily" | "weekly";
};
export type RecommendationPlan = {
  planDate: string; timeZoneId: string; isStale: boolean; isProfileComplete: boolean;
  status: "Pending" | "Generated" | "Failed" | null; generatedAt: string | null; nextRefreshAt: string;
  failureCode?: string | null; generationId?: string | null;
  retryAfterSeconds: number; recommendations: RecommendationRecord[]; completedToday: RecommendationRecord[];
};
export async function getTodayPlan(): Promise<RecommendationPlan> {
  try { return await request("/api/AI/recommendations/today"); }
  catch (error) {
    if (error instanceof ApiError && error.status === 404) throw new ApiError(translate("recommendationUi.serverUpdate"), 404);
    throw error;
  }
}
export function recommendationTimeZone(): string { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
export function ensureDailyPlan(): Promise<GenerationState> {
  const zone = recommendationTimeZone();
  return request(`/api/AI/recommendations/ensure?timeZoneId=${encodeURIComponent(zone)}`, {method: "POST"});
}
export function getRecommendationHistory(skip = 0): Promise<RecommendationRecord[]> {
  return request(`/api/AI/recommendations/my?skip=${skip}&take=50`);
}
export type GenerationState = {status: "Pending" | "Generated" | "Failed"; message: string};
export function getRecommendations(): Promise<RecommendationRecord[]> { return request("/api/AI/recommendations/latest"); }
export async function getGenerationStatus(): Promise<GenerationState | null> {
  try { return await request("/api/AI/recommendations/status"); } catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
}
export function retryGeneration(): Promise<GenerationState> { return request("/api/AI/recommendations/generate", {method: "POST"}); }
export function updateRecommendationFeedback(id: number, feedback: "liked" | "disliked" | null, isCompleted: boolean): Promise<RecommendationRecord> {
  return request(`/api/User/Recommendation/${id}/feedback`, { method: "PATCH", body: JSON.stringify({feedback, isCompleted}) });
}


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
