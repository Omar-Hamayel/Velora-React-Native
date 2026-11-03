import { beforeEach, expect, it, vi } from "vitest";
vi.mock("react-native",()=>({Platform:{OS:"web"}}));
const storage=vi.hoisted(()=>new Map<string,string>());
vi.mock("@react-native-async-storage/async-storage",()=>({default:{getItem:vi.fn(async(key:string)=>storage.get(key)??null),setItem:vi.fn(async(key:string,value:string)=>{storage.set(key,value);}),removeItem:vi.fn(async(key:string)=>{storage.delete(key);})}}));
import * as api from "../src/api/authApi";
import { i18n } from "../src/localization/core";
const fetchMock=vi.fn();
const ok=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
beforeEach(async()=>{storage.clear();await api.clearSession();await i18n.changeLanguage("en");vi.stubGlobal("fetch",fetchMock);fetchMock.mockReset();});
it("logs in with a real-shaped response, attaches JWT and restores the existing storage session",async()=>{
  fetchMock.mockResolvedValueOnce(ok({token:"synthetic-test-token",userId:"synthetic",fullName:"Synthetic User",email:"test@example.invalid",requiresProfileCompletion:true}));
  await api.login({email:"test@example.invalid",password:"Synthetic1"});
  expect(await api.loadPersistedSession()).toBe(true);
  fetchMock.mockResolvedValueOnce(ok({preferredLanguage:"en"}));await api.getPreferences();
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer synthetic-test-token");
});
it("uses actual catalog codes instead of guessed row order or translated names",async()=>{
  fetchMock.mockResolvedValueOnce(ok([{id:91,code:"hypertension",name:"اسم عرض"},{id:1,code:"legacy_diabetes",name:"Diabetes"}]));
  expect(await api.resolveDiseaseIds(["hypertension"])).toEqual([91]);
});
it("rejects ambiguous or unavailable condition codes without inventing a diagnosis",async()=>{
  fetchMock.mockResolvedValueOnce(ok([{id:1,code:"legacy_diabetes",name:"Type 2 Diabetes"}]));
  await expect(api.resolveDiseaseIds(["type_2_diabetes"])).rejects.toThrow();
});
it("maps exactly the four supported conditions by code with independent database IDs",async()=>{
  const codes: api.DiseaseType[] = ["type_2_diabetes", "hypertension", "hypercholesterolemia", "insulin_resistance"];
  const ids = [140, 17, 55, 72];
  fetchMock.mockResolvedValueOnce(ok([
    {id:1,code:"legacy_diabetes",name:"Diabetes"},
    {id:3,code:"legacy_dyslipidemia",name:"Dyslipidemia"},
    ...codes.map((code,index)=>({id:ids[index],code,name:"اسم عرض متغير"})),
  ]));
  expect(await api.resolveDiseaseIds(codes)).toEqual(ids);
});
it("does not persist a login or refreshed onboarding token when Remember me is off",async()=>{
  fetchMock.mockResolvedValueOnce(ok({token:"memory-only-token",userId:"synthetic",email:"test@example.invalid",fullName:"Synthetic",requiresProfileCompletion:true}));
  await api.login({email:"test@example.invalid",password:"NeverStoreThis1"},{rememberMe:false});
  expect(api.getAuthToken()).toBe("memory-only-token");
  expect(storage.has("velora_session")).toBe(false);
  fetchMock.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({token:"refreshed-memory-only",requiresProfileCompletion:false}));
  await api.completeOnboarding({heightCm:170,weightKg:75,waistCircumferenceCm:85,activityLevel:"Light",sleepHours:8,waterIntakeLitersPerDay:2,isSmoker:false,stressLevel:"Low"},[]);
  expect(api.getAuthToken()).toBe("refreshed-memory-only");
  expect(storage.has("velora_session")).toBe(false);
});
it("Remember me persists the session without password or changing the backend login body",async()=>{
  const payload={email:"test@example.invalid",password:"NeverStoreThis1"};
  fetchMock.mockResolvedValueOnce(ok({token:"remembered-token",userId:"synthetic",email:payload.email,fullName:"Synthetic",requiresProfileCompletion:false}));
  await api.login(payload,{rememberMe:true});
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(payload);
  expect(storage.get("velora_session")).not.toContain(payload.password);
  expect(JSON.parse(storage.get("velora_session")!).rememberMe).toBe(true);
  expect(await api.loadPersistedSession()).toBe(true);
  await api.clearSession();expect(storage.has("velora_session")).toBe(false);
});
it("switching Remember me off removes an older stored session",async()=>{
  const response={token:"synthetic",userId:"synthetic",email:"test@example.invalid",fullName:"Synthetic",requiresProfileCompletion:false};
  fetchMock.mockImplementation(async()=>ok(response));
  await api.login({email:response.email,password:"Synthetic1"},{rememberMe:true});
  expect(storage.has("velora_session")).toBe(true);
  await api.login({email:response.email,password:"Synthetic1"},{rememberMe:false});
  expect(storage.has("velora_session")).toBe(false);
});
it("loads saved user conditions separately and adds a specific catalog code without sending UserId",async()=>{
  api.setAuthToken("synthetic-token");
  fetchMock.mockResolvedValueOnce(ok([{id:31,diseaseId:17,conditionCode:"hypertension",isDiagnosed:true}]))
    .mockResolvedValueOnce(ok([{id:140,code:"type_2_diabetes",name:"اسم عرض"}]))
    .mockResolvedValueOnce(ok({id:32,diseaseId:140,conditionCode:"type_2_diabetes",diagnosisDate:null,isDiagnosed:true}));
  expect((await api.getUserDiseases())[0].conditionCode).toBe("hypertension");
  await api.addUserDisease("type_2_diabetes");
  expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe("/api/User/UserDisease");
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({diseaseId:140,isDiagnosed:true,diagnosisDate:null});
  expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer synthetic-token");
});
it("updates dates and removes owned condition record IDs without replacing the diagnosis",async()=>{
  const record:api.UserDiseaseRecord={id:32,diseaseId:140,conditionCode:"type_2_diabetes",diseaseName:"Type 2 Diabetes",isDiagnosed:true,diagnosisDate:null,notes:"existing note"};
  fetchMock.mockResolvedValueOnce(ok(record)).mockResolvedValueOnce(new Response(null,{status:204}));
  await api.updateUserDisease(record,"2024-03-05");await api.removeUserDisease(record.id);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({diagnosisDate:"2024-03-05",isDiagnosed:true,notes:"existing note"});
  expect(new URL(fetchMock.mock.calls[1][0]).pathname).toBe("/api/User/UserDisease/32");
  expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
});
const body={heightCm:170,weightKg:75,waistCircumferenceCm:85,activityLevel:"Light" as const,sleepHours:8,waterIntakeLitersPerDay:2,isSmoker:false,stressLevel:"Low" as const};
it("English and Arabic forms build the identical numeric, unit-stable onboarding payload",async()=>{
  const en=api.onboardingBody(body,[91]);await i18n.changeLanguage("ar");
  expect(api.onboardingBody(body,[91])).toEqual(en);
  expect(en).toEqual({body:{heightCm:170,weightKg:75,waistCircumferenceCm:85},lifestyle:{isSmoker:false,sleepHours:8,waterIntakeLitersPerDay:2,stressLevel:1,activityLevel:2},diseases:{diseaseIds:[91]}});
});
it("saves incomplete body/lifestyle through existing onboarding routes without generating",async()=>{
  fetchMock.mockImplementation(async()=>ok({}));await api.submitBodyInfo(body);
  expect(fetchMock.mock.calls.map(call=>new URL(call[0]).pathname)).toEqual(["/api/User/Onboarding/body","/api/User/Onboarding/lifestyle"]);
});
it("completes onboarding with actual disease IDs and stores the refreshed token",async()=>{
  fetchMock.mockResolvedValueOnce(ok([{id:91,code:"hypertension",name:"Hypertension"}])).mockResolvedValueOnce(ok({token:"refreshed",userId:"synthetic",requiresProfileCompletion:false}));
  await api.completeOnboarding(body,["hypertension"]);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).diseases).toEqual({diseaseIds:[91]});expect(api.getAuthToken()).toBe("refreshed");
});
it("retrieves persisted recommendations and maps feedback/completion to the owned row ID",async()=>{
  fetchMock.mockImplementation(async()=>ok([]));await api.getRecommendations();await api.updateRecommendationFeedback(51,"liked",true);
  expect(fetchMock.mock.calls[0][0]).toContain("/api/AI/recommendations/latest");
  expect(fetchMock.mock.calls[1][0]).toContain("/api/User/Recommendation/51/feedback");expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({feedback:"liked",isCompleted:true});
});
it("language changes only PATCH preferences and send no user ID or health fields",async()=>{
  fetchMock.mockResolvedValue(ok({preferredLanguage:"ar"}));await api.updatePreferences("ar");
  expect(fetchMock).toHaveBeenCalledTimes(1);expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({preferredLanguage:"ar"});
});
it("sends optional missing medical inputs as omissions rather than fabricated zeros",async()=>{
  fetchMock.mockImplementation(async()=>ok({}));await api.submitLabResult({fastingGlucose:undefined,hbA1c:5.6});
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({hbA1c:5.6});
});
it.each([400,401,403,404,422,500,502,503,530])("localizes HTTP %i without displaying backend traces",async(status)=>{
  fetchMock.mockResolvedValue(ok({message:"SECRET_STACK_TRACE"},status));api.setAuthToken("synthetic");await i18n.changeLanguage("ar");
  await expect(api.getPreferences()).rejects.toMatchObject({status,message:expect.not.stringContaining("SECRET")});
  if(status===401)expect(api.getAuthToken()).toBeNull();
});
it("reports a plain-text Cloudflare 530 login response as service reachability, not bad credentials",async()=>{
  fetchMock.mockResolvedValueOnce(new Response("error code: 1033\n",{status:530,headers:{"Content-Type":"text/plain"}}));
  await i18n.changeLanguage("ar");
  await expect(api.login({email:"synthetic@example.invalid",password:"SyntheticOnly1"},{rememberMe:false}))
    .rejects.toMatchObject({status:530,message:i18n.t("errors.gateway")});
  expect(api.getAuthToken()).toBeNull();expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("uses actual Father/Mother enum strings, with no guessed ordinal",async()=>{
  fetchMock.mockResolvedValueOnce(ok([{id:91,code:"hypertension",name:"Hypertension"}])).mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({}));
  await api.submitFamilyHistory({entries:[{disease:"hypertension",relation:"mother"}]});
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({diseaseId:91,relation:"Mother"});
});
it("reports transport failures safely without implicit retries",async()=>{
  fetchMock.mockRejectedValue(Error("network"));await expect(api.getPreferences()).rejects.toMatchObject({status:0});expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("maps a missing generation status to no attempt",async()=>{
  fetchMock.mockResolvedValue(ok({},404));expect(await api.getGenerationStatus()).toBeNull();
});
it("explains a missing daily-plan API instead of presenting old advice as current",async()=>{
  fetchMock.mockResolvedValueOnce(ok({},404));
  await expect(api.getTodayPlan()).rejects.toMatchObject({status:404,message:i18n.t("recommendationUi.serverUpdate")});
});
it("reads the daily snapshot and paged history, and explicitly ensures the device-zone plan without health or identity payloads",async()=>{
  fetchMock.mockImplementation(async()=>ok({}));
  await api.getTodayPlan();await api.getRecommendationHistory(50);await api.ensureDailyPlan();
  const calls=fetchMock.mock.calls;
  expect(new URL(calls[0][0]).pathname).toBe("/api/AI/recommendations/today");
  expect(new URL(calls[1][0]).search).toBe("?skip=50&take=50");
  expect(new URL(calls[1][0]).pathname).toBe("/api/AI/recommendations/my");
  expect(new URL(calls[2][0]).pathname).toBe("/api/AI/recommendations/ensure");
  expect(new URL(calls[2][0]).searchParams.get("timeZoneId")).toBe(api.recommendationTimeZone());
  expect(calls[2][1].method).toBe("POST");expect(calls[2][1].body).toBeUndefined();
  expect(calls[0][1].method).toBeUndefined();
});
it("times out with one controlled request and no retry storm",async()=>{
  vi.useFakeTimers();
  fetchMock.mockImplementation((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener("abort",()=>reject(Error("aborted")))));
  const result=api.getPreferences();
  const check=expect(result).rejects.toMatchObject({status:408});
  await vi.advanceTimersByTimeAsync(25000);await check;
  expect(fetchMock).toHaveBeenCalledTimes(1);vi.useRealTimers();
});
it("does not carry another account's demographic display data into a new login",async()=>{
  api.setCurrentUser({userId:"a",email:"a@example.invalid",fullName:"User A",gender:"male",dateOfBirth:"1990-01-01"});
  fetchMock.mockResolvedValueOnce(ok({token:"synthetic",userId:"b",email:"b@example.invalid",fullName:"User B",requiresProfileCompletion:true}));
  await api.login({email:"b@example.invalid",password:"Synthetic1"});expect(api.getCurrentUser()?.gender).toBeUndefined();expect(api.getCurrentUser()?.dateOfBirth).toBeUndefined();
});
