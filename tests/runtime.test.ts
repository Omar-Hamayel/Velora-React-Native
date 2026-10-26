import { expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({allow:vi.fn(),force:vi.fn(),reload:vi.fn(),store:vi.fn().mockResolvedValue(undefined),patch:vi.fn().mockResolvedValue({preferredLanguage:"ar"})}));
vi.mock("react-native",()=>({Alert:{alert:vi.fn()},Platform:{OS:"android"},I18nManager:{isRTL:false,allowRTL:mocks.allow,forceRTL:mocks.force},DevSettings:{reload:mocks.reload}}));
vi.mock("expo-localization",()=>({getLocales:()=>[{languageCode:"ar"}]}));
vi.mock("expo-updates",()=>({isEnabled:false,reloadAsync:vi.fn()}));
vi.mock("@react-native-async-storage/async-storage",()=>({default:{getItem:vi.fn().mockResolvedValue(null),setItem:mocks.store}}));
vi.mock("../src/api/authApi",()=>({getAuthToken:()=>"synthetic",getPreferences:vi.fn().mockResolvedValue({preferredLanguage:"en"}),updatePreferences:mocks.patch}));
import { applyLanguage, initializeLocalization, selectLanguage, restartForDirection } from "../src/localization/runtime";
it("sets native RTL for Arabic and reverses it for English",async()=>{
  await applyLanguage("ar");expect(mocks.allow).toHaveBeenLastCalledWith(true);expect(mocks.force).toHaveBeenLastCalledWith(true);
  await applyLanguage("en");expect(mocks.allow).toHaveBeenLastCalledWith(false);expect(mocks.force).toHaveBeenLastCalledWith(false);
});
it("detects the device, persists manual selection and syncs only preferences",async()=>{
  await initializeLocalization();expect(mocks.force).toHaveBeenLastCalledWith(true);
  await selectLanguage("ar");expect(mocks.store).toHaveBeenCalledWith("velora.language.v1","ar");expect(mocks.patch).toHaveBeenCalledWith("ar");
});
it("performs native developer reload only from the explicit restart action",async()=>{
  expect(mocks.reload).not.toHaveBeenCalled();await restartForDirection();expect(mocks.reload).toHaveBeenCalledTimes(1);
});
