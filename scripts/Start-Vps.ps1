param([Parameter(Mandatory = $true)][string]$ApiUrl)
$ErrorActionPreference = 'Stop'
$apiOrigin = [Uri]$ApiUrl
if (-not $apiOrigin.IsAbsoluteUri -or $apiOrigin.Scheme -ne 'https' -or $apiOrigin.IsLoopback -or
    $apiOrigin.UserInfo -or $apiOrigin.Query -or $apiOrigin.Fragment -or $apiOrigin.AbsolutePath -ne '/' -or
    $apiOrigin.Host -match 'CHANGE_ME|\.invalid$') {
    throw 'ApiUrl must be the actual public backend HTTPS origin, such as https://api.yourdomain.com.'
}
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    # Process variables take precedence; skip .env.local to avoid accidentally using localhost.
    $env:EXPO_NO_DOTENV = '1'
    $env:EXPO_PUBLIC_API_BASE_URL = $apiOrigin.GetLeftPart([UriPartial]::Authority)
    $env:EXPO_PUBLIC_ALLOW_LOCAL_HTTP = 'false'
    Write-Host "Expo will use backend: $env:EXPO_PUBLIC_API_BASE_URL"
    & npx expo start --lan --clear
    exit $LASTEXITCODE
}
finally { Pop-Location }
