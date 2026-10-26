import { deviceLanguage, isLanguage, type Language } from "./core";
export const LANGUAGE_KEY = "velora.language.v1";
export interface PreferenceStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; }
export interface PreferenceApi { get(): Promise<{preferredLanguage: Language}>; patch(language: Language): Promise<unknown>; }
export class LanguagePreferences {
  language: Language = "en";
  manual = false;
  constructor(private storage: PreferenceStorage, private api: PreferenceApi, private apply: (language: Language) => Promise<unknown>) {}
  async initialize(deviceCode?: string | null) {
    const stored = await this.storage.getItem(LANGUAGE_KEY);
    this.manual = isLanguage(stored);
    this.language = isLanguage(stored) ? stored : deviceLanguage(deviceCode);
    await this.apply(this.language);
  }
  async select(language: Language, authenticated: boolean) {
    if (!isLanguage(language)) throw new Error("Unsupported language");
    // Persist before sync/reload. A failed PATCH stays retryable at the next sign-in or selector retry.
    await this.storage.setItem(LANGUAGE_KEY, language);
    this.manual = true;
    this.language = language;
    await this.apply(language);
    if (authenticated) await this.api.patch(language);
  }
  async synchronize() {
    if (this.manual) { await this.api.patch(this.language); return; }
    const remote = await this.api.get();
    if (!isLanguage(remote.preferredLanguage)) throw new Error("Unsupported server language");
    this.language = remote.preferredLanguage;
    await this.apply(this.language);
  }
}
