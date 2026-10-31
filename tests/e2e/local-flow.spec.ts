import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const evidence=process.env.VELORA_MOBILE_EVIDENCE;
test.skip(!evidence,"Set VELORA_MOBILE_EVIDENCE to the isolated local fixture directory; never run against production.");
const backend="http://127.0.0.1:18081";
function sql(query:string) {
  const db=fs.readFileSync(path.join(evidence!,"database.txt"),"utf8").replace(/^\uFEFF/,"").trim();
  if(!/^Velora_Mobile_[a-f0-9]{32}$/.test(db)) throw Error("Not an isolated synthetic database");
  return execFileSync("sqlcmd",["-I","-S","(localdb)\\MSSQLLocalDB","-E","-d",db,"-h","-1","-W","-Q","SET NOCOUNT ON;"+query],{encoding:"utf8"}).trim();
}
function dbSnapshot(userId:string) {
  if(!/^[a-f0-9-]{36}$/.test(userId))throw Error("Invalid synthetic subject");
  return sql(`SELECT (SELECT COUNT(*) FROM RecommendationGenerations WHERE UserId='${userId}') AS attempts,(SELECT COUNT(*) FROM Recommendations WHERE UserId='${userId}') AS recommendations,(SELECT TOP(1) RequestHash FROM RecommendationGenerations WHERE UserId='${userId}' ORDER BY RequestedAt DESC) AS fingerprint FOR JSON PATH,WITHOUT_ARRAY_WRAPPER`);
}
async function settle(page:Page) { await page.waitForTimeout(1500); }
async function click(page:Page,text:string) { await page.getByText(text,{exact:true}).first().click(); await settle(page); }
for(const language of ["en","ar"] as const) test(`real ${language} registration, onboarding, automatic AI, persisted feedback and language-only switch`,async({page,request})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const calls:string[]=[];page.on("request",r=>{if(r.url().startsWith(backend))calls.push(new URL(r.url()).pathname);});
  const email=`mobile-${language}-${Date.now()}@example.invalid`,password="SyntheticMobile1";
  await page.goto("/");await expect(page.locator("video")).toHaveCount(0,{timeout:45000});
  await click(page,"Get Started");
  if(language==="ar") { await page.getByRole("button",{name:"Change language",exact:true}).click(); await page.getByRole("radio",{name:"العربية",exact:true}).click(); }
  await expect(page.locator("html")).toHaveAttribute("dir",language==="ar"?"rtl":"ltr");
  const en=language==="en";
  await click(page,en?"Sign Up":"إنشاء حساب");
  await page.getByPlaceholder(en?"Enter your full name":"أدخل اسمك الكامل").fill(en?"Synthetic Mobile User":"مستخدم تجريبي");
  await page.getByPlaceholder(en?"Enter your email":"أدخل بريدك الإلكتروني").fill(email);
  await page.getByPlaceholder(en?"Create a password":"أنشئ كلمة مرور").fill(password);
  await page.getByPlaceholder(en?"Re-enter your password":"أعد إدخال كلمة المرور").fill(password);
  await click(page,en?"Next":"التالي");
  await click(page,en?"Female":"أنثى");
  await page.getByPlaceholder("DD/MM/YYYY").fill("01011990");
  const registered=page.waitForResponse(r=>r.url().endsWith("/register")&&r.request().method()==="POST");
  await click(page,en?"Create Account":"إنشاء حساب");
  const registration=await registered;expect(registration.status()).toBe(200);const userId=(await registration.json()).userId;
  await expect(page.getByText(en?"Check your email":"تحقق من بريدك الإلكتروني",{exact:true})).toBeVisible();
  const messages=JSON.parse(fs.readFileSync(path.join(evidence!,"synthetic-mail.json"),"utf8"));
  const mail=messages.findLast((m:{to:string})=>m.to.includes(email));expect(mail).toBeTruthy();
  const match=mail.html.match(/href=["'](http:\/\/127\.0\.0\.1:18081\/confirm-email\.html\?[^"']+)/);expect(match).toBeTruthy();
  const confirmation=new URL(match[1].replace(/&amp;/g,"&"));
  const verified=await request.get(backend+"/api/Identity/Auth/confirm-email",{params:{UserId:confirmation.searchParams.get("userId")!,Token:confirmation.searchParams.get("token")!}});
  expect(verified.status()).toBe(200); // real Identity confirmation token received over local SMTP, no database bypass
  await click(page,en?"Back to Login":"العودة لتسجيل الدخول");
  await page.getByPlaceholder(en?"Enter your email":"أدخل البريد الإلكتروني").fill(email);
  await page.getByPlaceholder(en?"Enter your password":"أدخل كلمة المرور").fill(password);
  await click(page,en?"Continue":"متابعة");
  await expect(page.getByText(en?"Tell us about your health":"أخبرنا عن صحتك",{exact:true})).toBeVisible();
  expect(dbSnapshot(userId)).toContain('"attempts":0');
  await page.getByPlaceholder(en?"e.g. 170":"مثال: 170").fill(en?"170":"١٧٠");
  await page.getByPlaceholder(en?"e.g. 68":"مثال: 68").fill(en?"75":"٧٥");
  await page.getByPlaceholder(en?"e.g. 80":"مثال: 80").fill(en?"85":"٨٥");
  await click(page,en?"Light":"خفيف");await click(page,en?"Next":"التالي");
  await page.getByPlaceholder(en?"e.g. 7.5":"مثال: 7.5").fill(en?"8":"٨");
  await click(page,en?"Low":"منخفض");await click(page,en?"No":"لا");
  await page.getByPlaceholder(en?"e.g. 2.5":"مثال: 2.5").fill(en?"2":"٢");
  await click(page,en?"Next":"التالي");
  expect(dbSnapshot(userId)).toContain('"attempts":0');
  await click(page,en?"Hypertension":"ارتفاع ضغط الدم");
  await click(page,en?"No known family history of these conditions":"لا يوجد تاريخ عائلي معروف لهذه الحالات");
  const completed=page.waitForResponse(r=>r.url().endsWith("/Onboarding/complete"));
  await click(page,en?"Finish":"إنهاء");
  const saved=await completed;expect(saved.status()).toBe(200);const savedBody=await saved.json();expect(savedBody.recommendationStatus).toBe("Generated");
  const headers={Authorization:`Bearer ${savedBody.token}`};
  await expect(page.getByText(en?"Today's recommendations":"توصيات اليوم",{exact:true})).toBeVisible();
  const rows=await (await request.get(backend+"/api/AI/recommendations/latest",{headers})).json();expect(rows).toHaveLength(5);
  const locale=JSON.parse(fs.readFileSync(path.join(process.cwd(),`src/localization/locales/${language}.json`),"utf8"));
  await expect(page.getByText(locale.recommendations[rows[0].recommendationCatalogId].title,{exact:true})).toBeVisible();
  expect(sql(`SELECT COUNT(*) FROM Recommendations WHERE UserId='${userId}' AND SafetyStatus NOT IN ('safe','caution')`)).toBe("0");
  await click(page,en?"Like":"أعجبني");await click(page,en?"Mark completed":"تحديد كمكتمل");
  const feedbackRows=await (await request.get(backend+"/api/AI/recommendations/latest",{headers})).json();
  expect(feedbackRows[0].feedback).toBe("liked");expect(feedbackRows[0].isCompleted).toBe(true);
  const before=dbSnapshot(userId);
  await page.screenshot({path:path.join(evidence!,`home-${language}.png`),fullPage:true});
  await click(page,en?"Profile":"الملف الشخصي");
  const langRequest=page.waitForResponse(r=>r.url().endsWith("/User/preferences")&&r.request().method()==="PATCH");
  await page.getByRole("button",{name:en?"Change language":"تغيير اللغة",exact:true}).click();
  await page.getByRole("radio",{name:en?"العربية":"English",exact:true}).click();expect((await langRequest).status()).toBe(200);
  expect(dbSnapshot(userId)).toBe(before);
  const after=await (await request.get(backend+"/api/AI/recommendations/latest",{headers})).json();expect(after).toEqual(feedbackRows);
  await expect(page.locator("html")).toHaveAttribute("dir",en?"rtl":"ltr");
  await click(page,en?"الرئيسية":"Home");
  const opposite=JSON.parse(fs.readFileSync(path.join(process.cwd(),`src/localization/locales/${en?"ar":"en"}.json`),"utf8"));
  await expect(page.getByText(opposite.recommendations[rows[0].recommendationCatalogId].title,{exact:true})).toBeVisible();
  await page.reload();await expect(page.locator("video")).toHaveCount(0,{timeout:45000});
  await expect(page.getByText(opposite.recommendations[rows[0].recommendationCatalogId].title,{exact:true})).toBeVisible({timeout:15000});
  expect(dbSnapshot(userId)).toBe(before);
  const nextAr = en;
  for (const [tile, add, label] of [
    [nextAr ? "نتائج التحاليل" : "Lab Results", nextAr ? "إضافة نتيجة تحليل" : "Add Lab Result", nextAr ? "سكر الصيام (mg/dL)" : "Fasting Glucose (mg/dL)"],
    [nextAr ? "ضغط الدم" : "Blood Pressure", nextAr ? "إضافة قراءة" : "Add Reading", nextAr ? "الضغط الانقباضي (mmHg)" : "Systolic (mmHg)"],
    [nextAr ? "الأدوية" : "Medication", nextAr ? "إضافة دواء" : "Add Medication", nextAr ? "الجرعة" : "Dose"],
  ]) {
    await click(page, tile);await page.getByRole("button", {name:add,exact:true}).click();
    await expect(page.getByText(label,{exact:true})).toBeVisible();
    await page.getByRole("button",{name:nextAr ? "رجوع" : "Back",exact:true}).click();await settle(page);
  }
  expect(dbSnapshot(userId)).toBe(before);
  expect(calls.filter(c=>c.endsWith("/recommendations/generate"))).toHaveLength(0);
  expect(calls.some(c=>c.includes("/recommendations/latest"))).toBe(true);
  expect(errors).toEqual([]);
  fs.writeFileSync(path.join(evidence!,`flow-${language}.json`),JSON.stringify({language,userId,checks:{registration:true,localSmtpConfirmation:true,login:true,partialSaveNoGeneration:true,automaticGeneration:true,recommendationCount:rows.length,feedback:true,languageSwitchNoBatchOrFingerprintChange:true,reopenPersistence:true,webRtl:true,noMobileFastApiCalls:true},databaseSnapshot:JSON.parse(before)},null,2));
});
