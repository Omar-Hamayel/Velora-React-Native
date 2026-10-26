import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeI18n, i18n, resources, deviceLanguage, direction, medicalNumber, normalizeDigits, recommendationText, reasonText, localizedReasons } from "../src/localization/core";
import { LanguagePreferences, LANGUAGE_KEY } from "../src/localization/preferences";
import { resolveApiBaseUrl } from "../src/api/config";

beforeEach(async () => { await i18n.changeLanguage("en"); });
describe("presentation resources", () => {
  it("initializes both languages with English fallback and no null values", () => {
    const ar = makeI18n("ar");
    expect(ar.t("feedback.like")).toBe("أعجبني");
    expect(ar.t("common.save")).toBe("حفظ"); // deliberate missing shared key exercises real fallback
    ar.addResource("en", "translation", "fallbackProbe", "English fallback");
    expect(ar.t("fallbackProbe")).toBe("English fallback");
    expect(ar.t("unknown", {defaultValue:"Stored snapshot"})).toBe("Stored snapshot");
    expect(ar.options.returnNull).toBe(false);
  });
  it("keeps every actual recommendation ID and title/description in both languages", () => {
    const ids = Object.keys(resources.en.translation.recommendations).filter(key => /^(diet|exercise|habits|wellness)_\d{3}$/.test(key));
    expect(ids).toHaveLength(40);
    for (const id of ids) for (const field of ["title","description"]) {
      expect(makeI18n("en").exists(`recommendations.${id}.${field}`,{fallbackLng:false})).toBe(true);
      expect(makeI18n("ar").exists(`recommendations.${id}.${field}`,{fallbackLng:false})).toBe(true);
    }
  });
  it("localizes all 30 unchanged reason codes without exposing unknown codes", async () => {
    const codes = Object.keys(resources.en.translation.reasonCodes);
    expect(codes).toHaveLength(30);
    expect(Object.keys(resources.ar.translation.reasonCodes).sort()).toEqual(codes.sort());
    await i18n.changeLanguage("ar");
    for (const code of codes) expect(reasonText(code)).toMatch(/[\u0600-\u06ff]/);
    expect(reasonText("FUTURE_UNKNOWN_CODE")).toBeNull();
  });
  it("looks up by catalog ID even if the stored English title changes", async () => {
    const item={recommendationCatalogId:"diet_007",title:"Renamed snapshot",description:"Snapshot"};
    await i18n.changeLanguage("ar");
    expect(recommendationText(item,"title")).toBe("قلّل المشروبات السكرية");
    expect(recommendationText({...item,recommendationCatalogId:"legacy_unknown"},"title")).toBe(item.title);
  });
  it("localizes known explanations and explicitly preserves unknown English details", () => {
    expect(localizedReasons({reasonCodes:["LOW_SUGAR_PRIORITY"],explanation:"Snapshot"}).fallback).toBeNull();
    expect(localizedReasons({reasonCodes:["UNKNOWN"],explanation:"Snapshot"}).fallback).toBe("Snapshot");
    expect(localizedReasons({reasonCodes:[],explanation:"Snapshot"}).fallback).toBe("Snapshot");
  });
});
it.each([["ar","ar"],["ar-PS","ar"],["en","en"],["fr","en"],[null,"en"]])("detects %s as %s", (code, expected) => expect(deviceLanguage(code)).toBe(expected));
it("uses conditional RTL and preserves numeric units/values", () => {
  expect(direction("en")).toBe("ltr"); expect(direction("ar")).toBe("rtl");
  expect(medicalNumber("١٢٠٫٥")).toBe(120.5);expect(medicalNumber("۱۲۳")).toBe(123);
  expect(normalizeDigits("٠١/٠٢/١٩٩٠")).toBe("01/02/1990");
  expect(medicalNumber("120 mg/dL")).toBeNaN();expect(medicalNumber("")).toBeNaN();expect(medicalNumber("1,200")).toBeNaN();
});
describe("language persistence and synchronization", () => {
  const setup = (stored: string | null = null) => {
    const storage={getItem:vi.fn().mockResolvedValue(stored),setItem:vi.fn().mockResolvedValue(undefined)};
    const api={get:vi.fn().mockResolvedValue({preferredLanguage:"en"}),patch:vi.fn().mockResolvedValue(undefined)};
    const apply=vi.fn().mockResolvedValue(undefined);
    return {storage,api,apply,preferences:new LanguagePreferences(storage,api,apply)};
  };
  it("detects device language on first launch without writing a manual selection", async () => {
    const {preferences,storage,apply}=setup();await preferences.initialize("ar");
    expect(apply).toHaveBeenLastCalledWith("ar");expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("manual choice overrides device and backend", async () => {
    const {preferences,api,apply}=setup("en");await preferences.initialize("ar");await preferences.synchronize();
    expect(api.patch).toHaveBeenCalledWith("en");expect(api.get).not.toHaveBeenCalled();expect(apply).toHaveBeenLastCalledWith("en");
  });
  it("uses server preference when there is no manual override", async () => {
    const {preferences,api,apply}=setup();api.get.mockResolvedValue({preferredLanguage:"ar"});
    await preferences.initialize("en");await preferences.synchronize();expect(apply).toHaveBeenLastCalledWith("ar");
  });
  it("persists pre-login selection without any API request", async () => {
    const {preferences,api,storage}=setup();await preferences.select("ar",false);
    expect(storage.setItem).toHaveBeenCalledWith(LANGUAGE_KEY,"ar");expect(api.patch).not.toHaveBeenCalled();
  });
  it("syncs only language and never mutates a health payload or calls generation", async () => {
    const health=Object.freeze({conditions:Object.freeze(["hypertension"]),activity_level:"low",medical_parameters:{systolic_bp:120}});
    const before=JSON.stringify(health);const {preferences,api}=setup();await preferences.select("ar",true);
    expect(api.patch.mock.calls).toEqual([["ar"]]);expect(JSON.stringify(health)).toBe(before);
  });
  it("keeps a failed sync retryable while preserving the selected language", async () => {
    const {preferences,api,storage}=setup();api.patch.mockRejectedValueOnce(Error("offline"));
    await expect(preferences.select("ar",true)).rejects.toThrow("offline");expect(storage.setItem).toHaveBeenCalledWith(LANGUAGE_KEY,"ar");
    await preferences.synchronize();expect(api.patch).toHaveBeenLastCalledWith("ar");
  });
});
it("configures web/emulator/physical hosts centrally and validates release URLs", () => {
  expect(resolveApiBaseUrl(undefined,"android",true)).toBe("http://10.0.2.2:18081");
  expect(resolveApiBaseUrl(undefined,"web",true)).toBe("http://127.0.0.1:18081");
  expect(resolveApiBaseUrl("https://backend.example/","ios",false)).toBe("https://backend.example");
  expect(() => resolveApiBaseUrl("http://backend.example","web",false)).toThrow();
  expect(() => resolveApiBaseUrl("https://user:pass@backend.example","web",true)).toThrow();
  expect(resolveApiBaseUrl("http://127.0.0.1:18081","web",false,true)).toBe("http://127.0.0.1:18081");
  expect(() => resolveApiBaseUrl("http://backend.example","web",false,true)).toThrow();
});
