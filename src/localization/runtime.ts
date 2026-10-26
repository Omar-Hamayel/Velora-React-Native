import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { Alert, DevSettings, I18nManager, Platform } from "react-native";
import * as Updates from "expo-updates";
import { getAuthToken, getPreferences, updatePreferences } from "../api/authApi";
import { direction, i18n, translate, type Language } from "./core";
import { LanguagePreferences } from "./preferences";

export let nativeRestartRequired = false;
export async function applyLanguage(language: Language) {
  await i18n.changeLanguage(language);
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") { document.documentElement.dir = direction(language); document.documentElement.lang = language; }
  } else {
    const rtl = language === "ar";
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    nativeRestartRequired = I18nManager.isRTL !== rtl;
  }
}
export const languagePreferences = new LanguagePreferences(AsyncStorage, { get: getPreferences, patch: updatePreferences }, applyLanguage);
export async function initializeLocalization() { await languagePreferences.initialize(getLocales()[0]?.languageCode); }
export async function selectLanguage(language: Language) { await languagePreferences.select(language, Boolean(getAuthToken())); }
export async function synchronizeLanguage() { await languagePreferences.synchronize(); }
export async function restartForDirection() {
  if (Platform.OS === "web") return;
  if (__DEV__) DevSettings.reload();
  else if (Updates.isEnabled) await Updates.reloadAsync();
  else Alert.alert(translate("settings.restart"), translate("settings.restartManually"));
}
