# Local end-to-end setup

Existing projects only. Verified26 October2026 on Windows, Expo54/ReactNative0.81.5, Node24, Python3.14, .NET9 targets, SQLServer LocalDB. All test data is synthetic. Do not run migrations against a real/production database or reuse real SMTP credentials for the fixture.

## 1 Database and ASP.NET

SQL Server LocalDB instance `(localdb)\MSSQLLocalDB` must exist and your Windows identity must be able to create a test database. The earlier integration/localization migration sources already exist. The fixture creates a NEW `Velora_Mobile_<guid>` database and runs that existing migration chain. It keeps the database for audit; no deletion or production update occurs.

The exact fixture launcher is in the audit workspace:

```powershell
Set-Location 'D:\OneDrive - Birzeit University\Documents\ChatGPT\velora'
& '.\mobile-evidence\start-backend.ps1'
```

Read the script before using it. It uses existing `audit-tools/dotnet-ef.exe database update --no-build --project C:\Users\Qusay\source\repos\Velora-Backend\Velora.DAL --startup-project C:\Users\Qusay\source\repos\Velora-Backend\Velora.PL`, with explicit `VELORA_MIGRATION_CONNECTION` for the NEW DB. Build the existing backend first if binaries are absent:

```powershell
Set-Location 'C:\Users\Qusay\source\repos\Velora-Backend'
dotnet build Velora.sln --nologo
```

The launcher sets an isolated ConnectionStrings__DefaultConnection, synthetic local-only JWT key/issuer/audience, AiSettings__BaseUrl=http://127.0.0.1:18080, the matching synthetic service key, MaxRetryAttempts=0, and the loopback SMTP fixture. It starts `dotnet run --no-build --no-launch-profile --project <existing Velora.PL> --urls http://127.0.0.1:18081`. No appsettings secret is changed. CORS allows http://127.0.0.1:18082. JWT/auth/email confirmation remain enabled.

## 2 Private FastAPI

Use a separate terminal:

```powershell
Set-Location 'D:\Velora'
$env:VELORA_AI_API_KEY='integration-only-service-key'
& '.\.venv\Scripts\python.exe' -m uvicorn api:app --host 127.0.0.1 --port 18080 --log-level warning
```

Health: http://127.0.0.1:18080/health. Recommendation POST /recommendations is private and service-key protected. Mobile must never point its API URL at18080. The sample service/JWT/SMTP credentials are deliberately synthetic fixture values, not deployment secrets.

## 3 Local confirmation mail

Separate terminal:

```powershell
Set-Location 'D:\OneDrive - Birzeit University\Documents\ChatGPT\velora'
& 'D:\Velora\.venv\Scripts\python.exe' '.\mobile-evidence\smtp_fixture.py'
```

This is a loopback-only SMTP sink at127.0.0.1:18025. It never delivers externally. The existing EmailService uses the sink through normal configuration; `EnableSsl=false` is only for this local plaintext test protocol, with no certificate-validation override. Synthetic mail is retained in mobile-evidence/synthetic-mail.json. Use only *@example.invalid test accounts. Open the matching confirmation link locally or let the E2E runner consume its real Identity token. Never commit mail/token artifacts.

## 4 Expo web

```powershell
Set-Location 'D:\Velora-React-Native-main'
npm ci
```

The supplied `.env.local` is ignored by Git and contains loopback fixture settings:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:18081
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true
```

EXPO_PUBLIC_* values are public bundle configuration, never secrets. The second switch is exclusively for exported local browser testing and only permits loopback/Android-host-alias HTTP. Remove it and configure HTTPS for a release.

For development, the existing command is `npm run web -- --port 18082`. During this audit, automatic approval review rejected the dev-server launch with 'blocked by policy'; no bypass was attempted. The actual passing test ran the real Expo export instead:

```powershell
npx expo export --platform all --output-dir dist
& 'D:\Velora\.venv\Scripts\python.exe' -m http.server 18082 --bind 127.0.0.1 --directory 'D:\Velora-React-Native-main\dist'
```

Open http://127.0.0.1:18082. Register a synthetic account, confirm its local mail link, login, fill the existing body/lifestyle forms, choose an available canonical condition and Finish. Five persisted recommendations should load. Like/dislike/complete uses the existing feedback PATCH. Profile→Language switches presentation/account preference without regeneration. Missing catalog codes are blocked/hidden rather than guessed.

## 5 Emulator / physical device

| Client | EXPO_PUBLIC_API_BASE_URL | Backend binding/network |
|---|---|---|
|Browser on same PC|http://127.0.0.1:18081|loopback works; CORS exact web origin |
|Android standard emulator|http://10.0.2.2:18081|host alias, not device127.0.0.1; use Metro development build |
|iOS simulator on a Mac running backend/network forwarding|appropriate host origin|Windows cannot run iOS simulator;127.0.0.1 only refers to that simulator's host context |
|Physical device|http://<computer-LAN-address>:18081 for trusted development, or configured HTTPS|same trusted network; bind backend to reachable local interface, ensure approved firewall/routing; no permanent machine IP in source |

For a physical device, set the environment to its reachable ASP.NET origin, use `npm start`, and your existing Expo development/native workflow. The loopback fixture launcher is intentionally not LAN-exposed. Configure binding/CORS explicitly for your device test; do not disable authentication, certificate checks or expose FastAPI. Expo Go may reset native RTL; final RTL verification needs an existing development/native build and en↔ar restart testing. This host has SDK tools but `adb devices` had no devices and `emulator -list-avds` returned none. No native installation/device success is claimed.

## 6 Re-run verification

```powershell
Set-Location 'D:\Velora-React-Native-main'
npm run typecheck
npm test
$env:VELORA_MOBILE_EVIDENCE='D:\OneDrive - Birzeit University\Documents\ChatGPT\velora\mobile-evidence'
npx playwright test
```

Playwright requires the three local fixture services and the exported web server. Tests are explicitly skipped without the synthetic fixture-directory variable. They validate the unique database prefix before SQL reads, use installed Edge headless, and disable traces to avoid capturing JWTs. Browser testing does not replace device testing. No lint script was present; strict typecheck/export/helper/E2E evidence is reported separately.

```powershell
Set-Location 'D:\Velora'
& '.\.venv\Scripts\python.exe' -m pytest -q
& '.\.venv\Scripts\python.exe' scripts\export_contract.py --check --mirror 'C:\Users\Qusay\source\repos\Velora-Backend\docs\integration\contracts\v1'
Set-Location 'C:\Users\Qusay\source\repos\Velora-Backend'
$env:VELORA_TEST_AI_URL='http://127.0.0.1:18080'
dotnet test Velora.sln --nologo
```

Stop only services you started when finished. Synthetic databases/evidence are retained for inspection; no automatic data deletion is performed. This documentation contains no instruction to start Stage19 or training.

## Current review session

The local fixture was left running for review at http://127.0.0.1:18082. It uses only the new synthetic database recorded in audit mobile-evidence/database.txt. Current owned process IDs and ports are recorded in mobile-evidence/running-fixture.json; verify process identity before stopping them. Restart with the documented commands if the session has ended.
