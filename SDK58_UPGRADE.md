# Expo SDK 58 upgrade

Date: 31 October 2026 (Asia/Hebron). Existing project D:/Velora-React-Native-main upgraded from Expo54 to **Expo SDK 58.0.22**, React Native 0.88.1, React / React DOM 19.3.0 and TypeScript 6.0.3. Node24.21.0 satisfies the SDK tooling requirements. package-lock.json is updated; existing manual changes to the old Expo54 pin and lockfile were backed up first, not discarded. No replacement project, navigation redesign, backend/Python/database change or ML work occurred.

## Dependency/configuration changes

Used incremental official Expo install --fix steps54→55→56→57→58 and typechecked between steps. ReactNative, ReactDOM, @types/react, Babel, Metro runtime and the existing Expo packages match SDK58. Installed SDK-compatible expo-splash-screen and moved the removed app.json splash field to its config plugin, preserving the white background. Expo CLI also registered the required existing font/status-bar plugins. Existing en/ar supported locales, app identity/version, custom navigation, assets and application screens remain.

Migrated removed VideoView allowsFullscreen to fullscreenOptions.enable, removed obsolete ReactNative StatusBar translucent/backgroundColor props, replaced removed StyleSheet.absoluteFillObject with absoluteFill, and used ViewInstance for native view refs under the strict TypeScript API. No legacy TypeScript opt-out, typecheck weakening or ts-ignore was introduced.

## Verified results

| Command | Result | Evidence under audit workspace/sdk58-upgrade-2026-10-31 |
|---|---|---|
|Before: npm run typecheck; npm test|exit0;42 tests passed|typecheck-baseline.txt,tests-baseline.txt |
|npx expo install expo@^55.0.0 --fix|exit0|upgrade-55.txt |
|SDK55 npm run typecheck|exit0|typecheck-55.txt |
|npx expo install expo@^56.0.0 --fix|exit0|upgrade-56.txt |
|SDK56 npm run typecheck after absoluteFill migration|exit0|typecheck-56.txt |
|npx expo install expo@^57.0.0 --fix|exit0|upgrade-57.txt |
|SDK57 npm run typecheck|exit0|typecheck-57.txt |
|npx expo install expo@^58.0.0 --fix|exit0|upgrade-58.txt |
|Final npm run typecheck|exit0|typecheck-final.txt |
|Final npm test|exit0;42 passed/0 failed|tests-final.txt |
|npx expo-doctor@latest|exit0;20/20 checks passed|doctor-final.txt |
|npx expo install --check|exit0;dependencies aligned|dependency-check.txt |
|npx expo config --type introspect --json|exit0;SDK58, native en/ar still declared|native-config.json |
|npx expo export --platform all --output-dir dist|exit0;web,Android and iOS JS/Hermes bundles|export-all.txt |
|npm run test:sdk-upgrade|exit0;2 browser tests passed/0 failed|browser-smoke.txt,browser-smoke-results.json |
|git diff --check|exit0|diff-check.txt |

The two headless Edge browser tests exercise the real exported UI with explicitly mocked ASP.NET responses: restored Home, stable catalog-ID rendering, like/dislike/completion, en↔ar direction changes, no language-only generation call, intro/registration transitions, and visible forgot-password request confirmation. They are SDK/frontend smoke tests, not a claim that the real ASP.NET/FastAPI/SQL stack was rerun for this upgrade. Existing42 unit/helper/API tests remain green. Seven API/localization source/resource files were verified byte-identical to the pre-upgrade backup, including all medical/canonical mappings and English/Arabic resources. Native config still declares en/ar. The temporary loopback smoke server18083 was stopped after verification.

## Problems caught and resolved

SDK56 exposed the removed absoluteFillObject export; migrated it before continuing. SDK58's first typecheck caught the expected stricter View ref types; fixed with ViewInstance instead of bypassing the strict API. First Expo Doctor reported19/20 due to the removed splash property; the supported plugin migration resolves it and final20/20 passes. Package installs reported peer-transition warnings during incremental upgrades; the final npm dependency tree and Expo validation succeed.

## Remaining limits

Android/iOS JavaScript exports and config introspection are not native compiled APK/IPA or device tests. A custom development client built for SDK54 must be rebuilt for SDK58. Use an SDK58-compatible Expo Go installation if choosing Expo Go. Native RTL/device acceptance and Arabic medical translation approval remain as previously documented, not newly accepted here. Windows cannot run an iOS simulator.

Compatible npm audit fix removed the detected high/critical advisories without changing SDK major versions. Final npm audit still exits1 with13 moderate transitive build-tool advisories (glob/minimatch and dependent Expo tooling). npm's suggested force fix would downgrade Expo/updates incompatibly, so it was not applied. No high or critical advisories remain in that final npm audit; this is not a claim of zero vulnerabilities. The existing Vitest CommonJS/native-config-loader future warning remains non-fatal.

## Run inside VS Code / PowerShell

In the mobile folder, keep the existing ASP.NET API URL configuration, stop your old Metro instance, then run:

```powershell
npm run web -- --port 18082 --localhost --clear
```

For native development, rebuild the existing development app for SDK58 where applicable, then use npm run android or the existing device workflow. No backend/model command change is required for this SDK upgrade. To rerun the isolated UI smoke tests, export web, serve dist on loopback18083 in one terminal (for this machine: D:/Velora/.venv/Scripts/python.exe -m http.server 18083 --bind 127.0.0.1 --directory D:/Velora-React-Native-main/dist), then run npm run test:sdk-upgrade in another. The smoke tests do not need real login credentials or a running backend.

## Primary references reviewed

- [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [SDK55 release notes](https://expo.dev/changelog/sdk-55)
- [SDK56 release notes](https://expo.dev/changelog/sdk-56)
- [SDK57 release notes](https://expo.dev/changelog/sdk-57)
- [SDK58 release notes](https://expo.dev/changelog/sdk-58)
- [SDK58 migration overview](https://expo.dev/blog/how-to-upgrade-to-sdk-58)

Installed package metadata/types, generated Expo config, npm dependency validation and executable tests are the evidence for this app's concrete versions/compatibility. Source backup, starting Git diff and all intermediate command logs are retained in the audit directory. No user changes were reset and no original source/assets were deleted.
