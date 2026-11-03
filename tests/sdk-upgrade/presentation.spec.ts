import { test, expect, type Page } from "@playwright/test";
import en from "../../src/localization/locales/en.json";
import ar from "../../src/localization/locales/ar.json";

const fixtureHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
};

// SDK/rendering regression only. These API fixtures never contact a real backend, SQL or patient account.
test("restored Home renders localized catalog content, keeps feedback and changes direction", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  const calls: { path: string; method: string }[] = [];
  let language = "en";
  const recommendation = {
    id: 17,
    recommendationCatalogId: "diet_007",
    title: en.recommendations.diet_007.title,
    description: en.recommendations.diet_007.description,
    category: "Diet",
    safetyStatus: "safe",
    score: 80,
    reasonCodes: ["LOW_SUGAR_PRIORITY"],
    explanation: "Synthetic SDK rendering fixture",
    feedback: null as string | null,
    isCompleted: false,
    completedAt: null as string | null,
    generatedAt: new Date().toISOString(),
    recurrence: "daily",
    generationId: "00000000-0000-4000-8000-000000000058",
  };
  await page.addInitScript(() => {
    localStorage.setItem("velora.language.v1", "en");
    localStorage.setItem("velora_session", JSON.stringify({ token: "synthetic-rendering-fixture", user: { userId: "sdk-rendering-fixture", fullName: "SDK Rendering Fixture", email: "sdk@example.invalid" } }));
  });
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    calls.push({ path, method: request.method() });
    let body: unknown;
    if (path.endsWith("/Onboarding/status")) body = { requiresProfileCompletion: false, nextStep: null };
    else if (path.endsWith("/User/preferences")) {
      if (request.method() === "PATCH") language = request.postDataJSON().preferredLanguage;
      body = { preferredLanguage: language };
    } else if (path.endsWith("/recommendations/today")) body = {planDate:new Date().toISOString().slice(0,10),timeZoneId:"UTC",isStale:false,isProfileComplete:true,status:"Generated",generatedAt:new Date().toISOString(),nextRefreshAt:new Date(Date.now()+86400000).toISOString(),retryAfterSeconds:0,recommendations:[recommendation],completedToday:recommendation.isCompleted?[recommendation]:[]};
    else if (path.endsWith("/recommendations/my")) body = [recommendation];
    else if (path.endsWith("/recommendations/latest")) body = [recommendation];
    else if (path.endsWith("/recommendations/status")) body = { status: "Generated", message: "Synthetic fixture" };
    else if (path.endsWith("/17/feedback")) {
      Object.assign(recommendation, request.postDataJSON()); body = recommendation;
      recommendation.completedAt = recommendation.isCompleted ? new Date().toISOString() : null;
    } else if (path.endsWith("/UserHealthProfile")) body = [{ id: 1, heightCm: 170, weightKg: 75, bmi: 25.95, waistCircumferenceCm: 85, activityLevel: "LightlyActive", sleepHours: 8, stressLevel: "Low", isSmoker: false, waterIntakeLitersPerDay: 2 }];
    else if (path.endsWith("/UserDisease")) body = [];
    else if (path.endsWith("/Admin/Disease")) body = ["type_2_diabetes","hypertension","hypercholesterolemia","insulin_resistance"].map((code,index)=>({id:index+11,code,name:code}));
    else throw new Error(`Unexpected SDK smoke API route: ${request.method()} ${path}`);
    await route.fulfill({ status: 200, headers: fixtureHeaders, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(0, { timeout: 30000 });
  await expect(page.getByText(en.recommendations.diet_007.title, { exact: true })).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await page.getByText(en.feedback.like, { exact: true }).click();
  await expect.poll(() => recommendation.feedback).toBe("liked");
  await page.getByText(en.feedback.complete, { exact: true }).click();
  await expect.poll(() => recommendation.isCompleted).toBe(true);
  await expect(page.getByTestId("recommendation-17")).toHaveCount(0);
  await page.getByRole("tab",{name:"Completed today (1)",exact:true}).click();
  await expect(page.getByTestId("recommendation-17")).toContainText(en.feedback.completed);
  await page.getByTestId("daily-recommendations").screenshot({path:"test-results/daily-completed-en.png"});
  await page.getByText(en.recommendationUi.undo,{exact:true}).click();
  await expect.poll(() => recommendation.isCompleted).toBe(false);
  await page.getByRole("tab",{name:"Remaining today (1)",exact:true}).click();
  await page.getByText(en.feedback.dislike, { exact: true }).click();
  await expect.poll(() => recommendation.feedback).toBe("disliked");
  await expect(page.getByTestId("recommendation-17")).toHaveCount(0);
  await page.getByRole("tab",{name:en.recommendationUi.tab_history,exact:true}).click();
  await page.getByText(en.recommendationUi.undoDislike,{exact:true}).click();
  await expect.poll(() => recommendation.feedback).toBeNull();
  await page.getByRole("tab",{name:"Remaining today (1)",exact:true}).click();
  await page.getByText(en.feedback.complete,{exact:true}).click();
  await expect.poll(() => recommendation.isCompleted).toBe(true);
  await page.getByText(en.screens.BottomNav.profile, { exact: true }).click();
  await page.getByRole("button", { name: "Change language", exact: true }).click();
  await page.getByRole("radio", { name: "العربية", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect.poll(() => language).toBe("ar");
  await page.getByText(ar.screens.BottomNav.home, { exact: true }).click();
  await page.getByRole("tab",{name:`${ar.recommendationUi.tab_completed} (1)`,exact:true}).click();
  await expect(page.getByText(ar.recommendations.diet_007.title, { exact: true })).toBeVisible();
  await expect(page.getByTestId("recommendation-17")).toContainText(ar.feedback.completed);
  await page.waitForTimeout(1400);
  await page.getByTestId("daily-recommendations").screenshot({path:"test-results/daily-completed-ar.png"});
  expect(recommendation.feedback).toBeNull();
  expect(recommendation.recommendationCatalogId).toBe("diet_007");
  expect(calls.some(call => call.path.endsWith("/recommendations/generate"))).toBe(false);
  expect(pageErrors).toEqual([]);
});

test("intro, language switching, registration navigation and forgot-password feedback remain usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/Identity/Auth/forgot-password", route => route.fulfill({ status: 200, headers: fixtureHeaders, contentType: "application/json", body: JSON.stringify({ message: "If an account with that email exists, a password reset link has been sent." }) }));
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(0, { timeout: 30000 });
  await page.getByText(en.screens.Onboarding.getStarted, { exact: true }).click();
  await page.getByRole("button", { name: "Change language", exact: true }).click();
  await page.getByRole("radio", { name: "العربية", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByText(ar.screens.Welcome.forgotPassword, { exact: true }).click();
  await expect(page.getByText(ar.screens.Welcome.enterYourEmailAboveThenTapForgotPasswordAgain, { exact: true })).toBeVisible();
  await page.getByPlaceholder(ar.screens.Welcome.enterEmailOrPhoneNumber).fill("sdk@example.invalid");
  await page.getByText(ar.screens.Welcome.forgotPassword, { exact: true }).click();
  await expect(page.getByText(ar.screens.Welcome.ifAnAccountExistsForThatEmailWeVeSentPasswordResetInstructions, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "تغيير اللغة", exact: true }).click();
  await page.getByRole("radio", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.getByText(en.screens.Welcome.signUp, { exact: true }).click();
  await expect(page.getByPlaceholder(en.screens.SignUp.enterYourFullName)).toBeVisible();
  await page.getByPlaceholder(en.screens.SignUp.enterYourFullName).fill("Synthetic SDK User");
  await page.getByPlaceholder(en.screens.SignUp.enterYourEmail).fill("sdk@example.invalid");
  await page.getByPlaceholder(en.screens.SignUp.createAPassword).fill("SyntheticSDK58");
  await page.getByPlaceholder(en.screens.SignUp.reEnterYourPassword).fill("SyntheticSDK58");
  await page.getByText(en.screens.SignUp.next, { exact: true }).click();
  await expect(page.getByText(en.screens.SignUp.female, { exact: true })).toBeVisible();
  await page.getByRole("button",{name:`${en.dateUi.open.replace("{{field}}",en.screens.SignUp.dateOfBirth)}`,exact:true}).click();
  await page.getByRole("button",{name:en.dateUi.chooseYear,exact:true}).click();
  await page.getByRole("button",{name:"1990",exact:true}).click();
  await page.getByRole("button",{name:"Jan",exact:true}).click();
  await page.getByRole("button",{name:`${en.dateUi.chooseDay} 1990-01-15`,exact:true}).click();
  await expect(page.getByRole("textbox",{name:en.screens.SignUp.dateOfBirth,exact:true})).toHaveValue("15/01/1990");
  expect(errors).toEqual([]);
});

async function accountFixture(page: Page, restore: boolean, language: "en" | "ar" = "en", incomplete = false) {
  const catalog=[
    {id:11,code:"type_2_diabetes",name:"Type 2 Diabetes"},
    {id:28,code:"hypertension",name:"Hypertension"},
    {id:99,code:"hypercholesterolemia",name:"Hypercholesterolemia"},
    {id:42,code:"insulin_resistance",name:"Insulin Resistance"},
  ];
  let records=[
    {id:701,diseaseId:28,conditionCode:"hypertension",diseaseName:"Hypertension",diagnosisDate:null as string|null,isDiagnosed:true,notes:null},
    {id:702,diseaseId:1,conditionCode:"legacy_diabetes",diseaseName:"Diabetes",diagnosisDate:null as string|null,isDiagnosed:true,notes:null},
  ];
  const mutations:{method:string;path:string;body:any}[]=[];
  await page.addInitScript(({restore,language})=>{
    localStorage.setItem("velora.language.v1",language);
    if(restore)localStorage.setItem("velora_session",JSON.stringify({token:"synthetic-account-fixture",rememberMe:true,user:{userId:"synthetic",fullName:"Synthetic UI User",email:"ui@example.invalid"}}));
  },{restore,language});
  await page.route("**/api/**",async route=>{
    const request=route.request(),path=new URL(request.url()).pathname,method=request.method();
    if(method==="OPTIONS"){await route.fulfill({status:204,headers:fixtureHeaders});return;}
    if(method!=="GET")mutations.push({method,path,body:request.postData()?request.postDataJSON():null});
    let body:unknown={},status=200;
    if(path.endsWith("/Auth/login"))body={token:"synthetic-account-fixture",userId:"synthetic",fullName:"Synthetic UI User",email:"ui@example.invalid",requiresProfileCompletion:false};
    else if(path.endsWith("/Onboarding/status"))body={requiresProfileCompletion:incomplete,nextStep:incomplete?"BodyInformation":null};
    else if(path.endsWith("/Onboarding/body")||path.endsWith("/Onboarding/lifestyle"))body={};
    else if(path.endsWith("/User/preferences"))body={preferredLanguage:language};
    else if(path.endsWith("/recommendations/latest"))body=[];
    else if(path.endsWith("/recommendations/today"))body={planDate:new Date().toISOString().slice(0,10),timeZoneId:"UTC",isStale:false,isProfileComplete:true,status:"Generated",generatedAt:new Date().toISOString(),nextRefreshAt:new Date(Date.now()+86400000).toISOString(),retryAfterSeconds:0,recommendations:[],completedToday:[]};
    else if(path.endsWith("/recommendations/status")){status=404;body={message:"No attempt"};}
    else if(path.endsWith("/UserHealthProfile"))body=[{id:1,heightCm:170,weightKg:75,bmi:25.95,waistCircumferenceCm:85,activityLevel:"LightlyActive",sleepHours:8,stressLevel:"Low",isSmoker:false,waterIntakeLitersPerDay:2}];
    else if(path.endsWith("/Admin/Disease"))body=catalog;
    else if(["/LabResult","/BloodPressureReading","/Medication"].some(suffix=>path.endsWith(suffix))&&method==="GET")body=[];
    else if(path.endsWith("/UserDisease")){
      if(method==="GET")body=records;
      else if(method==="POST"){
        const payload=request.postDataJSON(),condition=catalog.find(item=>item.id===payload.diseaseId)!;
        const saved={id:800+records.length,diseaseId:condition.id,conditionCode:condition.code,diseaseName:condition.name,diagnosisDate:payload.diagnosisDate,isDiagnosed:payload.isDiagnosed,notes:null};
        records.push(saved);body=saved;status=201;
      }else throw Error("Unexpected condition request");
    } else if(/\/UserDisease\/\d+$/.test(path)){
      const id=Number(path.split("/").pop());
      if(method==="DELETE"){records=records.filter(record=>record.id!==id);status=204;}
      else if(method==="PUT"){const record=records.find(item=>item.id===id)!;Object.assign(record,request.postDataJSON());body=record;}
      else throw Error("Unexpected condition method");
    } else throw Error(`Unexpected isolated API fixture route: ${method} ${path}`);
    await route.fulfill({status,headers:fixtureHeaders,contentType:"application/json",body:status===204?undefined:JSON.stringify(body)});
  });
  return {mutations,records:()=>records};
}

test("profile separates saved conditions, adds another condition, edits its date and confirms removal",async({page})=>{
  const fixture=await accountFixture(page,true);
  const pageErrors:string[]=[];page.on("pageerror",error=>pageErrors.push(error.message));
  await page.goto("/");await expect(page.locator("video")).toHaveCount(0,{timeout:30000});
  await expect(page.getByText(en.home.todayRecommendations,{exact:true})).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await page.getByText(en.screens.BottomNav.profile,{exact:true}).click();
  await expect(page.getByText(en.conditionsUi.recorded,{exact:true})).toHaveCount(1);
  await expect(page.getByText(en.conditionsUi.notRecorded,{exact:true})).toHaveCount(3);
  await expect(page.getByText(en.conditionsUi.legacyTitle,{exact:true})).toBeVisible();
  await page.waitForTimeout(1400); // Finish the existing screen-transition animation before visual QA.
  await page.getByTestId("user-conditions").screenshot({path:"test-results/profile-conditions-en.png"});
  expect(fixture.mutations.filter(call=>call.path.includes("/UserDisease"))).toEqual([]);
  await page.getByRole("button",{name:"Add Type 2 Diabetes",exact:true}).click();
  await page.getByRole("button",{name:en.conditionsUi.save,exact:true}).click();
  await expect(page.getByText(en.conditionsUi.recorded,{exact:true})).toHaveCount(2);
  expect(fixture.mutations.at(-1)?.body).toEqual({diseaseId:11,isDiagnosed:true,diagnosisDate:null});
  expect(fixture.records().some(record=>record.conditionCode==="legacy_diabetes")).toBe(true);
  await page.getByRole("button",{name:"Edit Type 2 Diabetes",exact:true}).click();
  await page.getByRole("button",{name:en.dateUi.open.replace("{{field}}",en.conditionsUi.diagnosisDate),exact:true}).click();
  await page.getByRole("button",{name:en.dateUi.chooseYear,exact:true}).click();
  await page.getByRole("button",{name:"2024",exact:true}).click();
  await page.getByRole("button",{name:"Mar",exact:true}).click();
  await page.getByRole("button",{name:`${en.dateUi.chooseDay} 2024-03-05`,exact:true}).click();
  await page.getByRole("button",{name:en.conditionsUi.save,exact:true}).click();
  await expect(page.getByText("05/03/2024",{exact:true})).toBeVisible();
  expect(fixture.mutations.at(-1)?.body).toEqual({diagnosisDate:"2024-03-05",isDiagnosed:true,notes:null});
  await page.getByRole("button",{name:"Remove Type 2 Diabetes",exact:true}).click();
  await page.getByRole("button",{name:en.common.cancel,exact:true}).click();
  expect(fixture.mutations.filter(call=>call.method==="DELETE")).toHaveLength(0);
  await page.getByRole("button",{name:"Remove Type 2 Diabetes",exact:true}).click();
  await page.getByRole("button",{name:en.conditionsUi.confirmRemove,exact:true}).click();
  await expect(page.getByText(en.conditionsUi.recorded,{exact:true})).toHaveCount(1);
  expect(fixture.records().some(record=>record.conditionCode==="hypertension")).toBe(true);
  expect(pageErrors).toEqual([]);
});

async function expectArabicAlignment(page: Page) {
  const textStyles = await page.locator("[dir]").evaluateAll(elements => elements
    .filter(element => element.getClientRects().length && Array.from(element.childNodes)
      .some(node => node.nodeType === Node.TEXT_NODE && /[\u0621-\u064a]/.test(node.textContent ?? "")))
    .map(element => ({ text: element.textContent, align: getComputedStyle(element).textAlign, direction: getComputedStyle(element).direction })));
  expect(textStyles.length).toBeGreaterThan(3);
  expect(textStyles.filter(style=>style.align!=="right"||style.direction!=="rtl")).toEqual([]);
}

test("Arabic intro and registration align labels, validation and editable text at the right",async({page})=>{
  await accountFixture(page,false,"ar");
  await page.goto("/");
  await expect(page.getByText(ar.screens.Onboarding.getStarted,{exact:true})).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await expect(page.getByTestId("app-layout")).toHaveAttribute("dir","rtl");
  await expectArabicAlignment(page);
  await page.getByText(ar.screens.Onboarding.getStarted,{exact:true}).click();
  const email=page.getByPlaceholder(ar.screens.Welcome.enterEmailOrPhoneNumber);
  await expect(email).toHaveCSS("text-align","right");
  await expect(email).toHaveAttribute("dir","rtl");
  await email.fill("ui@example.invalid");
  await expect(email).toHaveAttribute("dir","ltr");
  await expect(email).toHaveCSS("text-align","right");
  await page.getByText(ar.screens.Welcome.signUp,{exact:true}).click();
  const name=page.getByPlaceholder(ar.screens.SignUp.enterYourFullName);
  await name.fill("أ");
  await expect(page.getByText(ar.screens.SignUp["3150CharactersLettersSpacesHyphensOrApostrophesOnly"],{exact:true})).toBeVisible();
  await expectArabicAlignment(page);
  await expect(name).toHaveCSS("text-align","right");
  await expect(name).toHaveAttribute("dir","rtl");
  const labelBox=await page.getByText(ar.screens.SignUp.fullName,{exact:true}).boundingBox();
  const inputRowBox=await name.locator("..").boundingBox();
  expect(Math.abs(labelBox!.x+labelBox!.width-inputRowBox!.x-inputRowBox!.width)).toBeLessThan(2);
  await name.fill("مستخدم تجريبي");
  await page.getByPlaceholder(ar.screens.SignUp.enterYourEmail).fill("ui@example.invalid");
  await page.getByPlaceholder(ar.screens.SignUp.createAPassword).fill("SyntheticUi1");
  await page.getByPlaceholder(ar.screens.SignUp.reEnterYourPassword).fill("SyntheticUi1");
  await page.waitForTimeout(1500); // Finish the existing transition before visual QA.
  await page.getByTestId("app-layout").screenshot({path:"test-results/rtl-registration-ar.png"});
  await page.getByText(ar.screens.SignUp.next,{exact:true}).click();
  await expect(page.getByText(ar.screens.SignUp.gender,{exact:true})).toBeVisible();
  await expectArabicAlignment(page);
  await expect(page.getByRole("textbox",{name:ar.screens.SignUp.dateOfBirth,exact:true})).toHaveCSS("text-align","right");
});

test("Arabic home, profile, record forms and modal roots use one RTL layout",async({page})=>{
  const fixture=await accountFixture(page,true,"ar");
  await page.goto("/");
  await expect(page.getByText(ar.home.todayRecommendations,{exact:true})).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await expectArabicAlignment(page);
  const home=await page.getByText(ar.screens.BottomNav.home,{exact:true}).boundingBox();
  const profile=await page.getByText(ar.screens.BottomNav.profile,{exact:true}).boundingBox();
  expect(home!.x).toBeGreaterThan(profile!.x);
  await page.getByText(ar.screens.BottomNav.profile,{exact:true}).click();
  await expect(page.getByText(ar.screens.Profile.personalInformation,{exact:true})).toBeVisible();
  await expectArabicAlignment(page);
  await page.getByText(ar.screens.Profile.editProfile,{exact:true}).click();
  await expect(page.getByPlaceholder(ar.screens.Profile.eG170)).toHaveCSS("text-align","right");
  await expect(page.getByPlaceholder(ar.screens.Profile.eG170)).toHaveAttribute("dir","ltr");
  await expectArabicAlignment(page);
  await page.getByText(ar.screens.Profile.cancel,{exact:true}).click();
  await page.getByRole("button",{name:"تغيير اللغة",exact:true}).click();
  await expect(page.getByTestId("language-dialog-layout")).toHaveAttribute("dir","rtl");
  await expectArabicAlignment(page);
  await page.getByRole("radio",{name:"العربية",exact:true}).click();
  await expect(page.getByTestId("language-dialog-layout")).toHaveCount(0);
  await page.getByRole("button",{name:ar.conditionsUi.removeLabel.replace("{{condition}}",ar.screens.HealthInfo.hypertension),exact:true}).click();
  await expect(page.getByTestId("condition-dialog-layout")).toHaveAttribute("dir","rtl");
  await expectArabicAlignment(page);
  await page.getByTestId("condition-dialog-layout").getByRole("button",{name:ar.common.cancel,exact:true}).click();
  const forms=[
    {screen:ar.screens.LabResults,tile:ar.screens.Profile.labResults,add:ar.screens.LabResults.addLabResult,input:ar.screens.LabResults.eG56},
    {screen:ar.screens.BloodPressure,tile:ar.screens.Profile.bloodPressure,add:ar.screens.BloodPressure.addReading,input:ar.screens.BloodPressure.eG120},
    {screen:ar.screens.Medication,tile:ar.screens.Profile.medication,add:ar.screens.Medication.addMedication,input:ar.screens.Medication.eGMetformin},
  ];
  for(const form of forms){
    await page.getByText(form.tile,{exact:true}).click();
    await page.getByRole("button",{name:form.add,exact:true}).click();
    await expectArabicAlignment(page);
    const input=page.getByPlaceholder(form.input,{exact:true});
    await expect(input).toHaveCSS("text-align","right");
    await expect(input).toHaveAttribute("dir","rtl");
    if(form.screen===ar.screens.Medication){
      await input.fill("دواء تجريبي");await expect(input).toHaveAttribute("dir","rtl");
      await page.waitForTimeout(1500);
      await page.getByTestId("app-layout").screenshot({path:"test-results/rtl-medication-ar.png"});
    }else{
      await input.fill("١٢٠");await expect(input).toHaveValue("120");
      await expect(input).toHaveAttribute("dir","ltr");
    }
    await page.getByRole("button",{name:ar.common.back,exact:true}).click();
    await expect(page.getByText(ar.screens.Profile.personalInformation,{exact:true})).toBeVisible();
  }
  expect(fixture.mutations.filter(call=>!call.path.endsWith("/User/preferences"))).toEqual([]);
});

test("Arabic health onboarding keeps body, lifestyle and family-history text aligned right",async({page})=>{
  const fixture=await accountFixture(page,true,"ar",true);
  await page.goto("/");
  await expect(page.getByText(ar.screens.HealthInfo.tellUsAboutYourHealth,{exact:true})).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await expectArabicAlignment(page);
  for(const [placeholder,value] of [[ar.screens.HealthInfo.eG170,"١٧٠"],[ar.screens.HealthInfo.eG68,"٧٥"],[ar.screens.HealthInfo.eG80,"٨٥"]]){
    const input=page.getByPlaceholder(placeholder,{exact:true});await input.fill(value);
    await expect(input).toHaveCSS("text-align","right");await expect(input).toHaveAttribute("dir","ltr");
  }
  await page.getByText(ar.screens.HealthInfo.light,{exact:true}).click();
  await page.getByText(ar.screens.HealthInfo.next,{exact:true}).click();
  await expect(page.getByText(ar.screens.HealthInfo.sleepHoursPerNight,{exact:true})).toBeVisible();
  await expectArabicAlignment(page);
  await page.getByPlaceholder(ar.screens.HealthInfo.eG75,{exact:true}).fill("٨");
  await page.getByText(ar.screens.HealthInfo.low,{exact:true}).click();
  await page.getByText(ar.screens.HealthInfo.no,{exact:true}).click();
  await page.getByPlaceholder(ar.screens.HealthInfo.eG25,{exact:true}).fill("٢٫٥");
  await page.getByText(ar.screens.HealthInfo.next,{exact:true}).click();
  await expect(page.getByText(ar.screens.HealthInfo.selectAConditionAboveToAddFamilyHistoryForIt,{exact:true})).toBeVisible();
  await expectArabicAlignment(page);
  await page.waitForTimeout(1500);
  await page.getByTestId("app-layout").screenshot({path:"test-results/rtl-health-conditions-ar.png"});
  expect(fixture.mutations.filter(call=>!call.path.endsWith("/User/preferences")).map(call=>call.path)).toEqual(["/api/User/Onboarding/body","/api/User/Onboarding/lifestyle"]);
});

test("Arabic conditions and calendar keep RTL layout with explicit year and month browsing",async({page})=>{
  const fixture=await accountFixture(page,true,"ar");
  await page.goto("/");await expect(page.locator("video")).toHaveCount(0,{timeout:30000});
  await expect(page.getByText(ar.home.todayRecommendations,{exact:true})).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await page.getByText(ar.screens.BottomNav.profile,{exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
  await expect(page.getByText(ar.conditionsUi.recorded,{exact:true})).toHaveCount(1);
  await page.waitForTimeout(1400);
  await page.getByRole("button",{name:ar.conditionsUi.addLabel.replace("{{condition}}",ar.screens.HealthInfo.insulinResistance),exact:true}).click();
  await page.getByRole("button",{name:ar.dateUi.open.replace("{{field}}",ar.conditionsUi.diagnosisDate),exact:true}).click();
  await page.getByRole("button",{name:ar.dateUi.chooseYear,exact:true}).click();
  await page.getByRole("button",{name:"2024",exact:true}).click();
  await page.getByRole("button",{name:new Intl.DateTimeFormat("ar",{month:"short"}).format(new Date(2024,2,1)),exact:true}).click();
  await page.waitForTimeout(350); // Wait for the Modal's existing fade before capturing its contents.
  await page.getByTestId("date-calendar").screenshot({path:"test-results/calendar-ar.png"});
  await page.getByRole("button",{name:`${ar.dateUi.chooseDay} 2024-03-05`,exact:true}).click();
  await page.getByRole("button",{name:ar.conditionsUi.save,exact:true}).click();
  await expect(page.getByText(ar.conditionsUi.recorded,{exact:true})).toHaveCount(2);
  expect(fixture.mutations.at(-1)?.body).toEqual({diseaseId:42,isDiagnosed:true,diagnosisDate:"2024-03-05"});
});

for(const remember of [false,true])test(`Remember me ${remember?"keeps":"does not keep"} the login across a reload`,async({page})=>{
  const fixture=await accountFixture(page,false);
  await page.goto("/");await expect(page.locator("video")).toHaveCount(0,{timeout:30000});
  await page.getByText(en.screens.Onboarding.getStarted,{exact:true}).click();
  await page.getByPlaceholder(en.screens.Welcome.enterEmailOrPhoneNumber).fill("ui@example.invalid");
  await page.getByPlaceholder(en.screens.Welcome.enterYourPassword).fill("SyntheticUi1");
  const checkbox=page.getByRole("checkbox",{name:en.accountUi.rememberMe,exact:true});
  await expect(checkbox).not.toBeChecked();if(remember)await checkbox.click();
  await page.getByText(en.screens.Welcome.continue,{exact:true}).click();
  await expect(page.getByText(en.home.todayRecommendations,{exact:true})).toBeVisible();
  const saved=await page.evaluate(()=>localStorage.getItem("velora_session"));
  if(remember){expect(saved).toContain("synthetic-account-fixture");expect(saved).not.toContain("SyntheticUi1");}
  else expect(saved).toBeNull();
  expect(fixture.mutations.find(call=>call.path.endsWith("/Auth/login"))?.body).toEqual({email:"ui@example.invalid",password:"SyntheticUi1"});
  // Reload without reseeding storage: addInitScript only sets language for this fixture.
  await page.reload();await expect(page.locator("video")).toHaveCount(0,{timeout:30000});
  await expect(page.getByText(remember?en.home.todayRecommendations:en.screens.Onboarding.getStarted,{exact:true})).toBeVisible();
});

test("Arabic Remember me aligns text and checkbox right, reverses for English and explains a gateway login failure",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("velora.language.v1","ar"));
  await page.route("**/api/**",async route=>{
    if(route.request().method()==="OPTIONS"){await route.fulfill({status:204,headers:fixtureHeaders});return;}
    if(new URL(route.request().url()).pathname.endsWith("/Auth/login")){
      await route.fulfill({status:530,headers:fixtureHeaders,contentType:"text/plain",body:"error code: 1033\n"});return;
    }
    throw Error("Unexpected request in the isolated gateway/RTL fixture");
  });
  await page.goto("/");
  await expect(page.getByText(ar.screens.Onboarding.getStarted,{exact:true})).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await page.getByText(ar.screens.Onboarding.getStarted,{exact:true}).click();
  const checkbox=page.getByRole("checkbox",{name:ar.accountUi.rememberMe,exact:true});
  await expect(checkbox).toBeVisible();
  await expect(page.getByText(ar.accountUi.rememberMe,{exact:true})).toHaveCSS("text-align","right");
  await expect(page.getByText(ar.accountUi.rememberHint,{exact:true})).toHaveCSS("text-align","right");
  const mark=await page.getByTestId("remember-mark").boundingBox(),copy=await page.getByTestId("remember-copy").boundingBox();
  expect(mark!.x).toBeGreaterThan(copy!.x+copy!.width);
  await checkbox.click();await expect(checkbox).toBeChecked();
  await page.waitForTimeout(1400);
  await checkbox.screenshot({path:"test-results/remember-me-ar.png"});
  await page.getByPlaceholder(ar.screens.Welcome.enterEmailOrPhoneNumber).fill("synthetic@example.invalid");
  await page.getByPlaceholder(ar.screens.Welcome.enterYourPassword).fill("SyntheticOnly1");
  await page.getByText(ar.screens.Welcome.continue,{exact:true}).click();
  await expect(page.getByText(ar.errors.gateway,{exact:true})).toBeVisible();
  await expect(page.getByText(ar.auth.invalidLogin,{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"تغيير اللغة",exact:true}).click();
  await page.getByRole("radio",{name:"English",exact:true}).click();
  await expect(page.getByText(en.accountUi.rememberMe,{exact:true})).toHaveCSS("text-align","left");
  await expect(page.getByText(en.accountUi.rememberHint,{exact:true})).toHaveCSS("text-align","left");
  await expect(page.getByTestId("app-layout")).toHaveAttribute("dir","ltr");
  await expect(page.getByPlaceholder(en.screens.Welcome.enterEmailOrPhoneNumber)).toHaveCSS("text-align","left");
  await expect(page.getByPlaceholder(en.screens.Welcome.enterYourPassword)).toHaveCSS("text-align","left");
  const englishMark=await page.getByTestId("remember-mark").boundingBox(),englishCopy=await page.getByTestId("remember-copy").boundingBox();
  expect(englishMark!.x+englishMark!.width).toBeLessThan(englishCopy!.x);
});


test("stale daily plan queues once, Refresh reads saved results and history is paged",async({page})=>{
  await accountFixture(page,true);
  const calls:{path:string;method:string}[]=[];
  const item={id:818,recommendationCatalogId:"diet_007",title:en.recommendations.diet_007.title,description:en.recommendations.diet_007.description,category:"Diet",safetyStatus:"safe",score:80,reasonCodes:["LOW_SUGAR_PRIORITY"],explanation:"Synthetic plan fixture",feedback:null,isCompleted:false,generationId:"daily-fixture",generatedAt:new Date().toISOString(),completedAt:null,recurrence:"daily"};
  let plan={planDate:new Date().toISOString().slice(0,10),timeZoneId:"UTC",isStale:true,isProfileComplete:true,status:null as string|null,generatedAt:null as string|null,nextRefreshAt:new Date(Date.now()+86400000).toISOString(),retryAfterSeconds:0,recommendations:[item],completedToday:[]};
  await page.route("**/api/AI/recommendations/**",async route=>{
    const url=new URL(route.request().url()),method=route.request().method();calls.push({path:url.pathname,method});
    if(method==="OPTIONS"){await route.fulfill({status:204,headers:fixtureHeaders});return;}
    let body:unknown;
    if(url.pathname.endsWith("/today"))body=plan;
    else if(url.pathname.endsWith("/ensure")){plan.status="Pending";body={status:"Pending",message:"Queued"};}
    else if(url.pathname.endsWith("/my")){
      const skip=Number(url.searchParams.get("skip"));expect(url.searchParams.get("take")).toBe("50");
      body=Array.from({length:skip===0?50:1},(_,index)=>({...item,id:1000+skip+index}));
    }else throw Error(`Unexpected lifecycle route ${url.pathname}`);
    await route.fulfill({status:200,headers:fixtureHeaders,contentType:"application/json",body:JSON.stringify(body)});
  });
  await page.goto("/");await expect(page.getByText(en.home.todayRecommendations,{exact:true})).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await expect.poll(()=>calls.filter(call=>call.path.endsWith("/ensure")).length).toBe(1);
  await expect(page.getByText(en.recommendationUi.pending,{exact:true})).toBeVisible();
  await expect(page.getByTestId("recommendation-818")).toHaveCount(0); // stale data must not leak into remaining tasks.
  plan={...plan,status:"Generated",isStale:false,generatedAt:new Date().toISOString()};
  await page.getByRole("button",{name:en.common.refresh,exact:true}).click();
  await expect(page.getByTestId("recommendation-818")).toBeVisible();
  await page.getByTestId("daily-recommendations").screenshot({path:"test-results/daily-remaining-en.png"});
  await page.getByRole("button",{name:en.recommendationUi.planDetails,exact:true}).click();
  await expect(page.getByText(en.recommendationUi.refreshHint,{exact:true})).toBeVisible();
  expect(calls.filter(call=>call.path.endsWith("/ensure"))).toHaveLength(1);
  expect(calls.filter(call=>call.path.endsWith("/generate"))).toHaveLength(0);
  await page.getByRole("tab",{name:en.recommendationUi.tab_history,exact:true}).click();
  await expect(page.locator('[data-testid^="recommendation-"]')).toHaveCount(50);
  await page.getByRole("button",{name:en.recommendationUi.more,exact:true}).click();
  await expect(page.locator('[data-testid^="recommendation-"]')).toHaveCount(51);
  await expect(page.getByRole("button",{name:en.recommendationUi.more,exact:true})).toHaveCount(0);
});

test("Arabic failed plan hides old content, controls retry and explains incomplete profiles",async({page})=>{
  await accountFixture(page,true,"ar");let retries=0,ensures=0;
  let plan={planDate:new Date().toISOString().slice(0,10),timeZoneId:"UTC",isStale:true,isProfileComplete:true,status:"Failed" as string|null,generatedAt:null,nextRefreshAt:new Date(Date.now()+86400000).toISOString(),retryAfterSeconds:2,recommendations:[],completedToday:[]};
  await page.route("**/api/AI/recommendations/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(route.request().method()==="OPTIONS"){await route.fulfill({status:204,headers:fixtureHeaders});return;}
    let body:unknown=plan;
    if(path.endsWith("/generate")){retries++;plan={...plan,status:"Pending",retryAfterSeconds:0};body={status:"Pending",message:"Queued"};}
    else if(path.endsWith("/ensure")){ensures++;throw Error("Failed/incomplete plans must not automatically retry from the UI");}
    else if(!path.endsWith("/today"))throw Error(`Unexpected retry route ${path}`);
    await route.fulfill({status:200,headers:fixtureHeaders,contentType:"application/json",body:JSON.stringify(body)});
  });
  await page.goto("/");await expect(page.getByText(ar.home.todayRecommendations,{exact:true})).toBeVisible();
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  const retry=page.getByRole("button",{name:ar.common.retry,exact:true});
  await expect(retry).toBeEnabled({timeout:5000});await retry.click();
  await expect.poll(()=>retries).toBe(1);
  await expect(page.getByText(ar.recommendationUi.pending,{exact:true})).toBeVisible();
  await expect(page.getByText(ar.recommendationUi.pendingBody,{exact:true})).toHaveCSS("text-align","right");
  await expect(page.getByText(ar.recommendationUi.stale,{exact:true})).toHaveCount(0);
  await page.getByTestId("daily-recommendations").screenshot({path:"test-results/daily-pending-ar.png"});
  plan={...plan,status:null,isProfileComplete:false};
  await page.getByRole("button",{name:ar.common.refresh,exact:true}).click();
  await expect(page.getByText(ar.recommendationUi.incomplete,{exact:true})).toBeVisible();
  expect(ensures).toBe(0);expect(retries).toBe(1);
});

test("Arabic failure uses one concise state, left icon, right-aligned wrapped text and preserves retry errors",async({page})=>{
  await page.setViewportSize({width:360,height:850});
  await accountFixture(page,true,"ar");
  let reads=0,retries=0,failed=true;
  const plan=()=>({planDate:"2026-11-03",timeZoneId:"UTC",isStale:true,isProfileComplete:true,status:failed?"Failed":"Pending",failureCode:"ai_unreachable",generationId:"synthetic-attempt",generatedAt:null,nextRefreshAt:new Date(Date.now()+86400000).toISOString(),retryAfterSeconds:0,recommendations:[],completedToday:[]});
  await page.route("**/api/AI/recommendations/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(route.request().method()==="OPTIONS"){await route.fulfill({status:204,headers:fixtureHeaders});return;}
    if(path.endsWith("/today"))reads++;
    else if(path.endsWith("/generate")){
      retries++;failed=false;
      await route.fulfill({status:504,headers:fixtureHeaders,contentType:"application/json",body:'{}'});return;
    }else throw Error(`Unexpected automatic generation ${path}`);
    await route.fulfill({status:200,headers:fixtureHeaders,contentType:"application/json",body:JSON.stringify(plan())});
  });
  await page.goto("/");await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  const state=page.getByTestId("plan-state");
  await expect(state).toContainText(ar.recommendationUi.failures.ai_unreachable);
  // Wait after the app is mounted; an early count=0 can precede the splash's first render.
  await expect(page.getByTestId("launch-splash")).toHaveCount(0,{timeout:30000});
  await expect(page.getByText(ar.recommendationUi.stale,{exact:true})).toHaveCount(0);
  await expect(page.getByText(ar.recommendationUi.unavailable,{exact:true})).toHaveCount(0);
  const copy=page.getByText(ar.recommendationUi.failures.ai_unreachable,{exact:true});
  await expect(copy).toHaveCSS("text-align","right");await expect(copy).toHaveCSS("direction","rtl");
  const iconBox=await page.getByTestId("plan-state-icon").boundingBox(),copyBox=await copy.boundingBox();
  expect(iconBox!.x+iconBox!.width).toBeLessThan(copyBox!.x);
  expect(copyBox!.height).toBeGreaterThan(30); // actual wrapped paragraph, not a one-line alignment probe
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByTestId("daily-recommendations").screenshot({path:"test-results/recommendations-failed-ar.png"});
  await page.getByRole("button",{name:ar.common.refresh,exact:true}).click();
  expect(retries).toBe(0);expect(reads).toBeGreaterThan(1);
  await page.getByRole("button",{name:ar.common.retry,exact:true}).click();
  await expect(page.getByRole("alert")).toContainText(ar.errors.timeout);
  expect(retries).toBe(1);
});
