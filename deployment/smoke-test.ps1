param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
)

$ErrorActionPreference = "Stop"
$target = $BaseUrl.TrimEnd("/")

$health = Invoke-RestMethod -Method Get -Uri "$target/api/health"
if ($health.status -ne "ok" -or $health.service -ne "opspilot-ai") {
    throw "Unexpected health response from $target"
}

$home = Invoke-WebRequest -Method Get -Uri $target
if ($home.StatusCode -ne 200) {
    throw "Home page returned HTTP $($home.StatusCode)"
}

Write-Host "Deployment smoke test passed for $target"
Write-Host "Reasoning mode: $($health.mode)"

