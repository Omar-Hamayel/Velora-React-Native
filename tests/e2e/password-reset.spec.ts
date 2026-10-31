import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const evidence=process.env.VELORA_MOBILE_EVIDENCE;
test.skip(!evidence,"Requires the isolated local mail/backend/database fixture.");
const backend="http://127.0.0.1:18081";
function mails() { return JSON.parse(fs.readFileSync(path.join(evidence!,"synthetic-mail.json"),"utf8")) as {to:string;html:string}[]; }
function ensureFixture() {
  const db=fs.readFileSync(path.join(evidence!,"database.txt"),"utf8").replace(/^\uFEFF/,"").trim();
  if(!/^Velora_Mobile_[a-f0-9]{32}$/.test(db))throw Error("Not an isolated synthetic fixture");
}
for(const language of ["en","ar"] as const) test(`forgot-password ${language}: visible confirmation and a real usable reset link`,async({page,request,context})=>{
  ensureFixture();
  const email=`reset-${language}-${Date.now()}@example.invalid`,oldPassword="SyntheticBefore1",newPassword="SyntheticAfter2";
  const registered=await request.post(backend+"/api/Identity/Auth/register",{data:{fullName:"Synthetic Reset User",email,password:oldPassword,confirmPassword:oldPassword,gender:"female",dateOfBirth:"1990-01-01"}});
  expect(registered.status()).toBe(200);
  const mail=mails().findLast(m=>m.to.includes(email))!;
  const link=mail.html.match(/href=["'](http:\/\/127\.0\.0\.1:18081\/confirm-email\.html\?[^"']+)/)!;
  const confirm=new URL(link[1].replace(/&amp;/g,"&"));
  expect((await request.get(backend+"/api/Identity/Auth/confirm-email",{params:{UserId:confirm.searchParams.get("userId")!,Token:confirm.searchParams.get("token")!}})).status()).toBe(200);
  await page.goto("/");await expect(page.locator("video")).toHaveCount(0,{timeout:45000});
  await page.getByText("Get Started",{exact:true}).click();await page.waitForTimeout(1500);
  if(language==="ar") { await page.getByRole("button",{name:"Change language",exact:true}).click(); await page.getByRole("radio",{name:"العربية",exact:true}).click(); }
  const locale=JSON.parse(fs.readFileSync(path.join(process.cwd(),`src/localization/locales/${language}.json`),"utf8"));
  const copy=locale.screens.Welcome;
  let forgotCalls=0;page.on("request",r=>{if(r.url().endsWith("/forgot-password"))forgotCalls++;});
  await page.getByText(copy.forgotPassword,{exact:true}).click();
  await expect(page.getByText(copy.enterYourEmailAboveThenTapForgotPasswordAgain,{exact:true})).toBeVisible();expect(forgotCalls).toBe(0);
  await page.getByPlaceholder(copy.enterEmailOrPhoneNumber).fill(email);
  const sent=page.waitForResponse(r=>r.url().endsWith("/forgot-password"));
  await page.getByText(copy.forgotPassword,{exact:true}).click();expect((await sent).status()).toBe(200);
  await expect(page.getByText(copy.ifAnAccountExistsForThatEmailWeVeSentPasswordResetInstructions,{exact:true})).toBeVisible();
  await expect(page.getByText(copy.enterYourEmailAboveThenTapForgotPasswordAgain,{exact:true})).toHaveCount(0);
  expect(forgotCalls).toBe(1);
  const resetMail=mails().findLast(m=>m.to.includes(email)&&m.html.includes("/reset-password.html?"))!;expect(resetMail).toBeTruthy();
  const resetLink=resetMail.html.match(/href=["'](http:\/\/127\.0\.0\.1:18081\/reset-password\.html\?[^"']+)/)!;
  const resetUrl=resetLink[1].replace(/&amp;/g,"&");
  const resetPage=await context.newPage();await resetPage.goto(resetUrl);
  await expect(resetPage.getByText("Reset your password",{exact:true})).toBeVisible();
  await resetPage.getByLabel("New password",{exact:true}).fill(newPassword);
  await resetPage.getByLabel("Confirm new password",{exact:true}).fill(newPassword);
  await resetPage.getByRole("button",{name:"Reset Password",exact:true}).click();
  await expect(resetPage.getByText("Password updated",{exact:true})).toBeVisible();
  expect((await request.post(backend+"/api/Identity/Auth/login",{data:{email,password:oldPassword}})).status()).toBe(400);
  expect((await request.post(backend+"/api/Identity/Auth/login",{data:{email,password:newPassword}})).status()).toBe(200);
  const parsed=new URL(resetUrl);
  expect((await request.post(backend+"/api/Identity/Auth/reset-password",{data:{email,token:parsed.searchParams.get("token"),newPassword:"SyntheticAnother3",confirmNewPassword:"SyntheticAnother3"}})).status()).toBe(400);
  await resetPage.close();
  await page.screenshot({path:path.join(evidence!,`forgot-success-${language}.png`)});
});

test("forgot-password keeps unknown and unconfirmed accounts neutral without sending reset mail",async({request})=>{
  ensureFixture();
  const email=`unconfirmed-reset-${Date.now()}@example.invalid`;
  expect((await request.post(backend+"/api/Identity/Auth/register",{data:{fullName:"Synthetic Unconfirmed User",email,password:"SyntheticBefore1",confirmPassword:"SyntheticBefore1",gender:"female",dateOfBirth:"1990-01-01"}})).status()).toBe(200);
  const before=mails().filter(m=>m.html.includes("/reset-password.html?")).length;
  for(const candidate of [email,`unknown-reset-${Date.now()}@example.invalid`]) {
    const response=await request.post(backend+"/api/Identity/Auth/forgot-password",{data:{email:candidate}});
    expect(response.status()).toBe(200);expect(await response.json()).toEqual({message:"If an account with that email exists, a password reset link has been sent."});
  }
  expect(mails().filter(m=>m.html.includes("/reset-password.html?")).length).toBe(before);
});
