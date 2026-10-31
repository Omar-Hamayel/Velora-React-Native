import { test, expect } from "@playwright/test";
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
    generationId: "00000000-0000-4000-8000-000000000058",
  };
  await page.addInitScript(() => {
    localStorage.setItem("velora.language.v1", "en");
    localStorage.setItem("velora_session", JSON.stringify({ token: "synthetic-rendering-fixture", user: { userId: "sdk-rendering-fixture", fullName: "SDK Rendering Fixture", email: "sdk@example.invalid" } }));
  });
  await page.route("http://127.0.0.1:18081/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    calls.push({ path, method: request.method() });
    let body: unknown;
    if (path.endsWith("/Onboarding/status")) body = { requiresProfileCompletion: false, nextStep: null };
    else if (path.endsWith("/User/preferences")) {
      if (request.method() === "PATCH") language = request.postDataJSON().preferredLanguage;
      body = { preferredLanguage: language };
    } else if (path.endsWith("/recommendations/latest")) body = [recommendation];
    else if (path.endsWith("/recommendations/status")) body = { status: "Generated", message: "Synthetic fixture" };
    else if (path.endsWith("/17/feedback")) {
      Object.assign(recommendation, request.postDataJSON()); body = recommendation;
    } else if (path.endsWith("/UserHealthProfile")) body = [{ id: 1, heightCm: 170, weightKg: 75, bmi: 25.95, waistCircumferenceCm: 85, activityLevel: "LightlyActive", sleepHours: 8, stressLevel: "Low", isSmoker: false, waterIntakeLitersPerDay: 2 }];
    else throw new Error(`Unexpected SDK smoke API route: ${request.method()} ${path}`);
    await route.fulfill({ status: 200, headers: fixtureHeaders, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(0, { timeout: 30000 });
  await expect(page.getByText(en.recommendations.diet_007.title, { exact: true })).toBeVisible();
  await page.getByText(en.feedback.like, { exact: true }).click();
  await expect.poll(() => recommendation.feedback).toBe("liked");
  await page.getByText(en.feedback.dislike, { exact: true }).click();
  await expect.poll(() => recommendation.feedback).toBe("disliked");
  await page.getByText(en.feedback.complete, { exact: true }).click();
  await expect.poll(() => recommendation.isCompleted).toBe(true);
  await page.getByText(en.screens.BottomNav.profile, { exact: true }).click();
  await page.getByRole("button", { name: "Change language", exact: true }).click();
  await page.getByRole("radio", { name: "العربية", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect.poll(() => language).toBe("ar");
  await page.getByText(ar.screens.BottomNav.home, { exact: true }).click();
  await expect(page.getByText(ar.recommendations.diet_007.title, { exact: true })).toBeVisible();
  await expect(page.getByText(ar.feedback.completed, { exact: true })).toBeVisible();
  expect(recommendation.feedback).toBe("disliked");
  expect(recommendation.recommendationCatalogId).toBe("diet_007");
  expect(calls.some(call => call.path.endsWith("/recommendations/generate"))).toBe(false);
  expect(pageErrors).toEqual([]);
});

test("intro, language switching, registration navigation and forgot-password feedback remain usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://127.0.0.1:18081/api/Identity/Auth/forgot-password", route => route.fulfill({ status: 200, headers: fixtureHeaders, contentType: "application/json", body: JSON.stringify({ message: "If an account with that email exists, a password reset link has been sent." }) }));
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
  expect(errors).toEqual([]);
});
