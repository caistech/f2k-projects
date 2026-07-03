# =============================================================================
#  migrate-to-sydney.ps1
#  Provision a NEW Supabase project in Sydney (ap-southeast-2) and MIRROR the
#  live Seoul project into it: schema + roles + data + auth users + storage +
#  auth config. This is Phases A-B of the migration runbook.
#
#  IT STOPS BEFORE CUTOVER. It does NOT:
#    - touch the live Seoul project (read-only on source),
#    - repoint Vercel / GHL / Resend,
#    - change any DNS or env on the live site.
#  The Seoul project stays fully live. Re-runnable / resumable.
#
#  Requires (auto-sourced where possible):
#    ~/.supabase-token            (Supabase Management API token)
#    .env.local POSTGRES_URL      (source DB connection string, w/ password)
#    .env.local SUPABASE_SERVICE_ROLE_KEY (source storage copy)
#    .env.local RESEND_API_KEY    (to set custom SMTP on the new project)
#    docker (running), supabase CLI, node  -- all verified present
#
#  Usage (from repo root):
#    powershell -ExecutionPolicy Bypass -File scripts/migrate-to-sydney.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
# Do not let a native command's stderr (e.g. docker/psql) terminate the run (PS7.3+).
$PSNativeCommandUseErrorActionPreference = $false

# ---- constants --------------------------------------------------------------
$SourceRef   = "earqebbwhklxadqawtex"
$OrgId       = "slswtirckvqfcqrlgzgi"
$Region      = "ap-southeast-2"
$NewName     = "F2K Projects (Sydney)"
$ApiBase     = "https://api.supabase.com/v1"
$MigDir      = Join-Path (Get-Location) ".migration"
$StateFile   = Join-Path $MigDir "state.json"
$KeysFile    = Join-Path $MigDir "sydney-keys.env"

# ---- helpers ----------------------------------------------------------------
function Section($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Info($msg)    { Write-Host "    $msg" }
function Ok($msg)      { Write-Host "    OK  $msg" -ForegroundColor Green }
function Warn($msg)    { Write-Host "    !!  $msg" -ForegroundColor Yellow }

function Get-EnvLocalValue([string]$key) {
  $f = ".env.local"
  if (-not (Test-Path $f)) { return $null }
  foreach ($line in Get-Content $f) {
    if ($line -match "^\s*$([regex]::Escape($key))=(.*)$") {
      $v = $matches[1].Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
      if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
      return $v
    }
  }
  return $null
}

function Mgmt([string]$method, [string]$path, $body = $null) {
  $headers = @{ Authorization = "Bearer $MgmtToken"; "Content-Type" = "application/json" }
  $uri = "$ApiBase$path"
  if ($body) {
    $json = ($body | ConvertTo-Json -Depth 20)
    return Invoke-RestMethod -Method $method -Uri $uri -Headers $headers -Body $json
  }
  return Invoke-RestMethod -Method $method -Uri $uri -Headers $headers
}

function New-StrongPassword([int]$len = 32) {
  $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".ToCharArray()
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object 'System.Byte[]' $len
  $rng.GetBytes($bytes)
  -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Load-State {
  if (Test-Path $StateFile) { return Get-Content $StateFile -Raw | ConvertFrom-Json }
  return [pscustomobject]@{}
}
function Save-State($state) {
  $state | ConvertTo-Json -Depth 10 | Set-Content $StateFile -Encoding utf8
}
function State-Set($state, $key, $val) {
  if ($state.PSObject.Properties.Name -contains $key) { $state.$key = $val }
  else { $state | Add-Member -NotePropertyName $key -NotePropertyValue $val }
  Save-State $state
}

# =============================================================================
Section "Pre-flight: tooling + secrets"
# =============================================================================
foreach ($t in @("docker", "supabase", "node")) {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { throw "$t not found on PATH" }
}
docker info *> $null; if ($LASTEXITCODE -ne 0) { throw "Docker is not running. Start Docker Desktop and re-run." }
Ok "docker, supabase, node present; docker daemon up"

if (-not (Test-Path $MigDir)) { New-Item -ItemType Directory -Path $MigDir | Out-Null }
# make sure .migration/ is never committed (PII + secrets live here)
$gi = ".gitignore"
if (-not (Test-Path $gi) -or -not (Select-String -Path $gi -Pattern '^\.migration/?$' -Quiet)) {
  Add-Content $gi "`n.migration/"
  Info "added .migration/ to .gitignore"
}

$MgmtToken = (Get-Content "$HOME/.supabase-token" -Raw).Trim()
if (-not $MgmtToken) { throw "no Supabase management token at ~/.supabase-token" }
Ok "management token loaded"

$SourceDbUrl = $env:SUPABASE_DB_URL
if (-not $SourceDbUrl) { $SourceDbUrl = Get-EnvLocalValue "POSTGRES_URL" }
if (-not $SourceDbUrl) { $SourceDbUrl = Read-Host "Paste the SOURCE (Seoul) DB connection string (postgres://...)" }
Ok "source DB url resolved"

$SourceServiceKey = Get-EnvLocalValue "SUPABASE_SERVICE_ROLE_KEY"
if (-not $SourceServiceKey) { $SourceServiceKey = Read-Host "Paste the SOURCE service-role key (for storage copy)" }
Ok "source service-role key resolved"

$SourceUrl = Get-EnvLocalValue "NEXT_PUBLIC_SUPABASE_URL"
if (-not $SourceUrl) { $SourceUrl = "https://$SourceRef.supabase.co" }

$ResendKey = Get-EnvLocalValue "RESEND_API_KEY"
if (-not $ResendKey) { $ResendKey = Read-Host "Paste the RESEND_API_KEY (to set custom SMTP on the new project; blank to skip)" }

$state = Load-State

# =============================================================================
Section "Step 1: provision the Sydney project"
# =============================================================================
if ($state.new_ref) {
  Ok "already provisioned: $($state.new_ref) (resuming)"
  $NewRef = $state.new_ref
  $NewDbPass = $state.db_password
} else {
  $NewDbPass = New-StrongPassword 32
  Info "creating project '$NewName' in $Region ..."
  $resp = Mgmt POST "/projects" @{
    organization_id = $OrgId
    name            = $NewName
    region          = $Region
    db_pass         = $NewDbPass
  }
  $NewRef = $resp.id
  State-Set $state "new_ref" $NewRef
  State-Set $state "db_password" $NewDbPass
  Ok "created project ref: $NewRef"
}

Info "waiting for project to become ACTIVE_HEALTHY (provisioning takes a few minutes)..."
$deadline = (Get-Date).AddMinutes(12)
do {
  Start-Sleep -Seconds 12
  try { $p = Mgmt GET "/projects/$NewRef" } catch { $p = $null }
  $status = if ($p) { $p.status } else { "PENDING" }
  Info "  status: $status"
  if ((Get-Date) -gt $deadline) { throw "timed out waiting for ACTIVE_HEALTHY (current: $status)" }
} while ($status -ne "ACTIVE_HEALTHY")
Ok "project is ACTIVE_HEALTHY"

# source pg major version -> matching restore image
$srcMajor = "15"
try {
  $sp = Mgmt GET "/projects/$SourceRef"
  if ($sp.database.version -match "^(\d+)") { $srcMajor = $matches[1] }
} catch {}
Info "source Postgres major: $srcMajor (restore image: postgres:$srcMajor)"

# =============================================================================
Section "Step 2: fetch new project keys + connection"
# =============================================================================
$keys = Mgmt GET "/projects/$NewRef/api-keys?reveal=true"
function Pick-Key($names) {
  foreach ($n in $names) {
    $k = $keys | Where-Object { $_.name -eq $n } | Select-Object -First 1
    if ($k) { return $k.api_key }
  }
  return $null
}
$NewAnon    = Pick-Key @("anon", "publishable")
$NewService = Pick-Key @("service_role", "secret")
if (-not $NewService) { throw "could not read new project's service_role/secret key from API" }
$NewUrl = "https://$NewRef.supabase.co"
Ok "new anon + service-role keys retrieved"

# dest session-pooler connection (port 5432) for the restore
$DestUrl = $null
try {
  $pool = Mgmt GET "/projects/$NewRef/config/database/pooler"
  $poolHost = $null
  if ($pool -is [System.Array]) { $poolHost = ($pool | Select-Object -First 1).db_host } else { $poolHost = $pool.db_host }
  if ($poolHost) {
    $encPass = [System.Uri]::EscapeDataString($NewDbPass)
    $DestUrl = "postgresql://postgres.$($NewRef):$encPass@$poolHost`:5432/postgres?sslmode=require"
    Ok "dest session-pooler host detected: $poolHost"
  }
} catch {}
if (-not $DestUrl) {
  Warn "could not auto-detect the dest pooler host."
  Info "In the Supabase dashboard for the NEW project: Settings -> Database -> Connection string -> 'Session pooler'."
  Info "Copy the URI (it looks like postgresql://postgres.${NewRef}:[YOUR-PASSWORD]@aws-N-${Region}.pooler.supabase.com:5432/postgres)."
  $pasted = Read-Host "Paste that Session-pooler URI (leave [YOUR-PASSWORD] as-is; I'll inject the generated password)"
  $encPass = [System.Uri]::EscapeDataString($NewDbPass)
  $DestUrl = $pasted -replace '\[YOUR-PASSWORD\]', $encPass
  if ($DestUrl -notmatch "sslmode=") { $DestUrl += "?sslmode=require" }
}

# persist keys for the eventual cutover (gitignored)
@"
# NEW Sydney project - generated $(Get-Date -Format o). DO NOT COMMIT.
NEW_PROJECT_REF=$NewRef
NEXT_PUBLIC_SUPABASE_URL=$NewUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NewAnon
SUPABASE_SERVICE_ROLE_KEY=$NewService
NEW_DB_PASSWORD=$NewDbPass
"@ | Set-Content $KeysFile -Encoding utf8
Ok "new keys written to .migration/sydney-keys.env (gitignored)"

# =============================================================================
Section "Step 3: dump the source (read-only on Seoul)"
# =============================================================================
$schemaSql = Join-Path $MigDir "schema.sql"
$dataSql   = Join-Path $MigDir "data.sql"
$rolesSql  = Join-Path $MigDir "roles.sql"
$authSql   = Join-Path $MigDir "auth.sql"

function Dump($label, $outfile, $extraArgs) {
  if ((Test-Path $outfile) -and (Get-Item $outfile).Length -gt 0) { Ok "$label dump exists, skipping"; return }
  Info "dumping $label ..."
  $dumpArgs = @("db", "dump", "--db-url", $SourceDbUrl, "-f", $outfile) + $extraArgs
  & supabase @dumpArgs
  if ($LASTEXITCODE -ne 0) { throw "$label dump failed" }
  Ok "$label dumped ($([math]::Round((Get-Item $outfile).Length/1KB,1)) KB)"
}
Dump "roles"  $rolesSql  @("--role-only")
Dump "schema" $schemaSql @()
Dump "data"   $dataSql   @("--data-only")
Dump "auth"   $authSql   @("--data-only", "--schema", "auth")

# =============================================================================
Section "Step 4: restore into Sydney (via docker postgres:$srcMajor)"
# =============================================================================
function Restore($label, $file) {
  if (($state.PSObject.Properties.Name -contains "restored_$label") -and $state."restored_$label") {
    Ok "$label already restored (state), skipping"; return
  }
  if (-not (Test-Path $file)) { Warn "$label file missing, skip"; return }
  Info "restoring $label ..."
  $log = "$file.restore.log"
  # native stderr must NOT abort the run; psql -v ON_ERROR_STOP=0 keeps going past
  # expected errors (already-existing managed objects, transient auth tables).
  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = Get-Content -Raw $file | docker run --rm -i "postgres:$srcMajor" psql "$DestUrl" -v ON_ERROR_STOP=0 -f - 2>&1
  $ErrorActionPreference = $prevEAP
  $lines = $output | ForEach-Object { "$_" }
  $lines | Out-File -FilePath $log -Encoding utf8
  $errs = ($lines | Select-String -Pattern "ERROR:" -SimpleMatch | Measure-Object).Count
  if ($errs -gt 0) { Warn "$label restore done with $errs ERROR line(s) - review $log (transient auth tables / already-existing managed objects are expected)" }
  else { Ok "$label restored clean" }
  State-Set $state "restored_$label" $true
}
Restore "roles"  $rolesSql
Restore "schema" $schemaSql
Restore "data"   $dataSql
Restore "auth"   $authSql

# =============================================================================
Section "Step 5: copy storage files (source -> dest)"
# =============================================================================
$env:SRC_URL = $SourceUrl; $env:SRC_KEY = $SourceServiceKey
$env:DST_URL = $NewUrl;    $env:DST_KEY = $NewService
node scripts/migrate-copy-storage.mjs
if ($LASTEXITCODE -ne 0) { Warn "storage copy reported errors - review output above (re-runnable)" } else { Ok "storage copy complete" }
Remove-Item Env:\SRC_KEY, Env:\DST_KEY -ErrorAction SilentlyContinue

# =============================================================================
Section "Step 6: mirror Auth config (SMTP, templates, redirect, limits)"
# =============================================================================
try {
  $srcAuth = Mgmt GET "/projects/$SourceRef/config/auth"
  $whitelist = @(
    "site_url","uri_allow_list","jwt_exp","mailer_otp_exp","password_min_length",
    "mailer_autoconfirm","mailer_secure_email_change_enabled",
    "smtp_admin_email","smtp_host","smtp_port","smtp_user","smtp_sender_name","smtp_max_frequency",
    "external_email_enabled","external_phone_enabled","rate_limit_email_sent",
    "mailer_subjects_confirmation","mailer_subjects_recovery","mailer_subjects_magic_link",
    "mailer_subjects_email_change","mailer_subjects_invite",
    "mailer_templates_confirmation_content","mailer_templates_recovery_content",
    "mailer_templates_magic_link_content","mailer_templates_email_change_content",
    "mailer_templates_invite_content"
  )
  $patch = @{}
  foreach ($k in $whitelist) {
    if ($srcAuth.PSObject.Properties.Name -contains $k -and $null -ne $srcAuth.$k) { $patch[$k] = $srcAuth.$k }
  }
  if ($ResendKey) {
    $patch["external_email_enabled"] = $true
    $patch["smtp_host"]   = "smtp.resend.com"
    $patch["smtp_port"]   = 465
    $patch["smtp_user"]   = "resend"
    $patch["smtp_pass"]   = $ResendKey
    if (-not $patch["smtp_admin_email"]) { $patch["smtp_admin_email"] = "noreply@updates.corporateaisolutions.com" }
  }
  if (-not $patch["rate_limit_email_sent"] -or [int]$patch["rate_limit_email_sent"] -lt 30) { $patch["rate_limit_email_sent"] = 30 }
  Mgmt PATCH "/projects/$NewRef/config/auth" $patch | Out-Null
  Ok "auth config mirrored (SMTP set, templates + redirect allow-list copied, rate limit >= 30)"
} catch {
  Warn "auth config mirror hit an error: $($_.Exception.Message) - re-runnable; can be set by hand later"
}
State-Set $state "phase_b_complete" $true

# =============================================================================
Section "Step 7: verify (row counts source vs dest)"
# =============================================================================
$checkTables = @(
  "public.agents","public.branscombe_registrations","public.seafields_registrations",
  "public.dutton_registrations","public.funder_registrations",
  "public.seafields_employer_registrations","public.email_suppressions","auth.users"
)
function Count($url, $tbl) {
  $sql = "select count(*) from $tbl;"
  $out = $sql | docker run --rm -i "postgres:$srcMajor" psql "$url" -tA -v ON_ERROR_STOP=0 2>$null
  if ($out) { return ($out | Select-Object -Last 1).Trim() } else { return "n/a" }
}
# raw psql rejects Supabase's non-libpq "supa" pooler marker param; strip it for verify.
$SourceDbUrlPsql = ($SourceDbUrl -replace '([?&])supa=[^&]*', '$1') -replace '[?&]$', '' -replace '\?&', '?'
Write-Host ("    {0,-44} {1,10} {2,10}" -f "table","source","dest")
$mismatch = 0
foreach ($t in $checkTables) {
  $s = Count $SourceDbUrlPsql $t
  $d = Count $DestUrl $t
  $flag = ""
  if ($s -ne $d) { $flag = "  <-- DIFF"; $mismatch++ }
  Write-Host ("    {0,-44} {1,10} {2,10}{3}" -f $t,$s,$d,$flag)
}

# =============================================================================
Section "PHASE B COMPLETE - stopped pre-cutover"
# =============================================================================
Write-Host @"
    New project : $NewName
    Ref         : $NewRef
    Region      : $Region (Sydney)
    URL         : $NewUrl
    Dashboard   : https://supabase.com/dashboard/project/$NewRef
    Keys/creds  : .migration/sydney-keys.env  (gitignored)

    The live Seoul project ($SourceRef) was READ-ONLY throughout and is untouched.
    NOTHING has been repointed. The site still runs on Seoul.
"@ -ForegroundColor Green
if ($mismatch -gt 0) { Warn "$mismatch table(s) show a row-count DIFF above - investigate before cutover." }
Info "Next: tell Claude 'Phase B done' with the table above. We review, then plan Phase C (cutover)."
Info "When you DO decommission the mirror or after cutover, delete .migration/ (it holds PII dumps + secrets)."
