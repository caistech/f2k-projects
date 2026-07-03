# =============================================================================
#  cutover-to-sydney.ps1  -- PHASE C (the cutover). Run AFTER migrate-to-sydney.ps1.
#
#  Flips the live app from the Seoul Supabase to the Sydney mirror, with a short
#  registration freeze so no lead is lost. It automates the scriptable parts and
#  PAUSES at the deliberate manual gates (the Vercel<->Supabase integration flip
#  and the redeploys). Each gate waits for you; nothing irreversible happens
#  without your confirmation. ASCII-only (PowerShell mis-parses non-ASCII .ps1).
#
#  Sequence:
#    GATE 1  freeze    set REGISTRATIONS_PAUSED=true (Vercel) -> you redeploy -> verify forms 503
#    GATE 2  delta     re-dump Seoul (data+auth+storage) -> truncate+reload Sydney -> verify parity
#    GATE 3  flip      auth-config parity check -> you flip the integration + unpause + redeploy
#    GATE 4  smoke     confirm a live write lands in Sydney; print the post-cutover task list
#
#  Requires: ~/.supabase-token, ~/.vercel-token, docker running, supabase CLI, node, curl.
#  Run from repo root:
#    powershell -ExecutionPolicy Bypass -File scripts/cutover-to-sydney.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

# ---- constants --------------------------------------------------------------
$SourceRef       = "earqebbwhklxadqawtex"
$ApiBase         = "https://api.supabase.com/v1"
$VercelProjectId = "prj_cFIXyKayp0eHLQIgg1zYbTQV85RU"   # f2k-projects (live)
$VercelTeamId    = "team_hwN7IFtd2Fo3DCj9C67ZwI1t"
$PoolerHostDest  = "aws-1-ap-southeast-2.pooler.supabase.com"
$MigDir          = Join-Path (Get-Location) ".migration"
$StateFile       = Join-Path $MigDir "state.json"

# ---- helpers ----------------------------------------------------------------
function Section($m){ Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Info($m){ Write-Host "    $m" }
function Ok($m){ Write-Host "    OK  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "    !!  $m" -ForegroundColor Yellow }
function Fail($m){ Write-Host "    XX  $m" -ForegroundColor Red }
function Gate($m){ Write-Host "`n>>> $m" -ForegroundColor Magenta; Read-Host "    Press Enter when done (Ctrl+C to abort)" | Out-Null }
function YesNo($m){ $a = Read-Host "    $m [y/N]"; return ($a -match '^(y|yes)$') }

function Get-EnvLocalValue([string]$key){
  $f = ".env.local"; if (-not (Test-Path $f)) { return $null }
  foreach ($line in Get-Content $f) {
    if ($line -match "^\s*$([regex]::Escape($key))=(.*)$") {
      $v = $matches[1].Trim()
      if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) { $v = $v.Substring(1,$v.Length-2) }
      return $v
    }
  }
  return $null
}
function Clean-PgUrl([string]$u){
  # raw psql rejects Supabase's non-libpq "supa" pooler marker
  return (($u -replace '([?&])supa=[^&]*','$1') -replace '\?&','?' -replace '[?&]$','')
}

function Mgmt($method,$path){
  $h = @{ Authorization = "Bearer $MgmtToken"; "Content-Type"="application/json" }
  return Invoke-RestMethod -Method $method -Uri "$ApiBase$path" -Headers $h
}
function VercelApi($method,$path,$body=$null){
  $h = @{ Authorization = "Bearer $VercelToken" }
  $uri = "https://api.vercel.com$path"
  if ($body) { return Invoke-RestMethod -Method $method -Uri $uri -Headers $h -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 10) }
  return Invoke-RestMethod -Method $method -Uri $uri -Headers $h
}
function Set-RegistrationsPaused([string]$val){
  $envs = (VercelApi GET "/v9/projects/$VercelProjectId/env?teamId=$VercelTeamId").envs
  $existing = $envs | Where-Object { $_.key -eq "REGISTRATIONS_PAUSED" } | Select-Object -First 1
  if ($existing) {
    VercelApi PATCH "/v9/projects/$VercelProjectId/env/$($existing.id)?teamId=$VercelTeamId" @{ value=$val; target=@("production","preview") } | Out-Null
  } else {
    VercelApi POST "/v10/projects/$VercelProjectId/env?teamId=$VercelTeamId" @{ key="REGISTRATIONS_PAUSED"; value=$val; type="plain"; target=@("production","preview") } | Out-Null
  }
}
function Probe-RegisterStatus(){
  return (& curl.exe -s -o NUL -w "%{http_code}" -X POST -H "content-type: application/json" -d "{}" "$SiteUrl/api/branscombe/register")
}

function PsqlScalar($url,$sql){
  $out = $sql | docker run --rm -i "postgres:$PgMajor" psql "$url" -tA -v ON_ERROR_STOP=0 2>$null
  if ($out) { return ($out | Select-Object -Last 1).ToString().Trim() } else { return $null }
}
function PsqlExec($url,$sql){
  $p=$ErrorActionPreference; $ErrorActionPreference='Continue'
  $r = $sql | docker run --rm -i "postgres:$PgMajor" psql "$url" -v ON_ERROR_STOP=0 2>&1
  $ErrorActionPreference=$p; return $r
}
function PsqlFile($url,$file,$label){
  $p=$ErrorActionPreference; $ErrorActionPreference='Continue'
  $r = Get-Content -Raw $file | docker run --rm -i "postgres:$PgMajor" psql "$url" -v ON_ERROR_STOP=0 2>&1
  $ErrorActionPreference=$p
  $errs = ($r | ForEach-Object { "$_" } | Select-String "ERROR:" -SimpleMatch | Measure-Object).Count
  if ($errs -gt 0) { Warn "$label load: $errs ERROR line(s) (transient/dup rows are expected)" } else { Ok "$label load clean" }
}

# =============================================================================
Section "Preflight"
# =============================================================================
foreach ($t in @("docker","supabase","node","curl.exe")) { if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { throw "$t not found" } }
docker info *> $null; if ($LASTEXITCODE -ne 0) { throw "Docker is not running." }
if (-not (Test-Path $StateFile)) { throw "no .migration/state.json - run migrate-to-sydney.ps1 (Phase B) first" }

$MgmtToken   = (Get-Content "$HOME/.supabase-token" -Raw).Trim()
$VercelToken = (Get-Content "$HOME/.vercel-token" -Raw).Trim()
$state       = Get-Content $StateFile -Raw | ConvertFrom-Json
$NewRef      = $state.new_ref
$NewDbPass   = $state.db_password
if (-not $NewRef -or -not $NewDbPass) { throw "state.json missing new_ref/db_password" }

$SourceDbUrl = $env:SUPABASE_DB_URL; if (-not $SourceDbUrl) { $SourceDbUrl = Get-EnvLocalValue "POSTGRES_URL" }
if (-not $SourceDbUrl) { $SourceDbUrl = Read-Host "Paste SOURCE (Seoul) DB connection string" }
$SourceDbUrlPsql = Clean-PgUrl $SourceDbUrl
$encPass = [System.Uri]::EscapeDataString($NewDbPass)
$DestUrl = "postgresql://postgres.$($NewRef):$encPass@$PoolerHostDest`:5432/postgres?sslmode=require"

$SiteUrl = Get-EnvLocalValue "NEXT_PUBLIC_CANONICAL_URL"; if (-not $SiteUrl) { $SiteUrl = "https://f2k-projects.vercel.app" }
$SiteUrl = $SiteUrl.TrimEnd('/')

$PgMajor = "17"
try { $sp = Mgmt GET "/projects/$SourceRef"; if ($sp.database.version -match "^(\d+)") { $PgMajor = $matches[1] } } catch {}

Ok "source: $SourceRef   dest: $NewRef   site: $SiteUrl   pg: $PgMajor"
# sanity: both DBs reachable
$srcUsers = PsqlScalar $SourceDbUrlPsql "select count(*) from auth.users"
$dstUsers = PsqlScalar $DestUrl "select count(*) from auth.users"
if (-not $srcUsers) { throw "cannot reach SOURCE db" }
if (-not $dstUsers) { throw "cannot reach DEST db" }
Ok "connectivity OK (source auth.users=$srcUsers, dest auth.users=$dstUsers)"

Write-Host "`nThis will FREEZE registrations, sync the final delta, and walk you through the flip." -ForegroundColor Yellow
if (-not (YesNo "Proceed with the cutover now?")) { Info "Aborted. Nothing changed."; exit 0 }

# =============================================================================
Section "GATE 1 - Freeze registrations"
# =============================================================================
Info "setting REGISTRATIONS_PAUSED=true on Vercel (production+preview)..."
Set-RegistrationsPaused "true"
Ok "flag set"
Gate "REDEPLOY f2k-projects production now (Vercel dashboard 'Redeploy', or push an empty commit) so the freeze takes effect."
$code = Probe-RegisterStatus
if ($code -eq "503") { Ok "forms are frozen (register endpoint returns 503)" }
else { Warn "register endpoint returned HTTP $code (expected 503). The freeze may not be live yet."; if (-not (YesNo "Continue anyway?")) { exit 1 } }

# =============================================================================
Section "GATE 2 - Final delta sync (exact parity)"
# =============================================================================
$dataSql = Join-Path $MigDir "data.sql"
$authSql = Join-Path $MigDir "auth.sql"
Info "re-dumping data from Seoul (read-only)..."
& supabase db dump --db-url $SourceDbUrl --data-only -f $dataSql; if ($LASTEXITCODE -ne 0) { throw "data dump failed" }
Info "re-dumping auth from Seoul..."
& supabase db dump --db-url $SourceDbUrl --data-only --schema auth -f $authSql; if ($LASTEXITCODE -ne 0) { throw "auth dump failed" }
Ok "fresh dumps captured"

Info "re-copying storage (new files only)..."
$env:SRC_URL = "https://$SourceRef.supabase.co"
$env:SRC_KEY = (Get-EnvLocalValue "SUPABASE_SERVICE_ROLE_KEY")
$env:DST_URL = "https://$NewRef.supabase.co"
$env:DST_KEY = ((Mgmt GET "/projects/$NewRef/api-keys?reveal=true") | Where-Object { $_.name -in @("service_role","secret") } | Select-Object -First 1).api_key
node scripts/migrate-copy-storage.mjs
Remove-Item Env:\SRC_KEY, Env:\DST_KEY -ErrorAction SilentlyContinue

Info "truncating dest public tables + reloading data (exact parity)..."
$tableList = PsqlScalar $DestUrl "select string_agg(format('%I.%I', schemaname, tablename), ',') from pg_tables where schemaname='public'"
if (-not $tableList) { throw "could not enumerate dest public tables" }
PsqlExec $DestUrl "set session_replication_role=replica; truncate $tableList restart identity cascade; set session_replication_role=default;" | Out-Null
$wrapped = Join-Path $MigDir "data.wrapped.sql"
"set session_replication_role=replica;" | Set-Content $wrapped -Encoding utf8
Get-Content -Raw $dataSql | Add-Content $wrapped -Encoding utf8
"`nset session_replication_role=default;" | Add-Content $wrapped -Encoding utf8
PsqlFile $DestUrl $wrapped "data"
Remove-Item $wrapped -ErrorAction SilentlyContinue
PsqlFile $DestUrl $authSql "auth (additive)"

Info "verifying parity across ALL public tables..."
$pubTables = (PsqlScalar $SourceDbUrlPsql "select string_agg(format('%I.%I', schemaname, tablename), '|') from pg_tables where schemaname='public'") -split '\|'
$mismatch = 0
foreach ($t in ($pubTables | Sort-Object)) {
  if (-not $t) { continue }
  $s = PsqlScalar $SourceDbUrlPsql "select count(*) from $t"
  $d = PsqlScalar $DestUrl "select count(*) from $t"
  if ($s -ne $d) { Fail ("{0,-46} src={1} dst={2}" -f $t,$s,$d); $mismatch++ }
}
$au_s = PsqlScalar $SourceDbUrlPsql "select count(*) from auth.users";  $au_d = PsqlScalar $DestUrl "select count(*) from auth.users"
$ai_s = PsqlScalar $SourceDbUrlPsql "select count(*) from auth.identities"; $ai_d = PsqlScalar $DestUrl "select count(*) from auth.identities"
if ($au_s -ne $au_d) { Warn "auth.users src=$au_s dst=$au_d (a new signup during the window? investigate)" }
if ($ai_s -ne $ai_d) { Warn "auth.identities src=$ai_s dst=$ai_d" }
if ($mismatch -gt 0) { Fail "$mismatch public table(s) differ - NOT safe to flip. Forms stay frozen. Investigate, then re-run."; exit 1 }
Ok "all public tables match source exactly; auth.users $au_d / identities $ai_d"

# =============================================================================
Section "GATE 3 - Auth-config parity + the integration flip"
# =============================================================================
try {
  $sAuth = Mgmt GET "/projects/$SourceRef/config/auth"
  $dAuth = Mgmt GET "/projects/$NewRef/config/auth"
  function Cmp($field,$label){
    $sv = $sAuth.$field; $dv = $dAuth.$field
    if ("$sv" -ne "$dv") { Warn "$label differs - Seoul='$sv' Sydney='$dv'" } else { Ok "$label matches ($sv)" }
  }
  Cmp "site_url" "Site URL"
  Cmp "external_email_enabled" "Email auth enabled"
  Cmp "external_google_enabled" "Google sign-in enabled"
  Cmp "smtp_host" "Custom SMTP host"
  Cmp "mailer_otp_exp" "OTP expiry"
  if ("$($sAuth.external_google_enabled)" -eq "True" -and "$($dAuth.external_google_enabled)" -ne "True") {
    Warn "GOOGLE SIGN-IN is ON in Seoul but OFF in Sydney - configure the Google provider (client id/secret + redirect) on Sydney BEFORE the flip, or Google logins will fail."
  }
  if ("$($sAuth.uri_allow_list)" -ne "$($dAuth.uri_allow_list)") { Warn "Redirect allow-list differs - ensure Sydney allows the prod /api/auth/callback + /api/auth/confirm URLs." }
} catch { Warn "could not compare auth config: $($_.Exception.Message)" }

Write-Host "`n    Sydney values for the flip (also in .migration/sydney-keys.env):" -ForegroundColor Cyan
Info "NEXT_PUBLIC_SUPABASE_URL = https://$NewRef.supabase.co"
Info "Dashboard               = https://supabase.com/dashboard/project/$NewRef"
Gate @"
Do the flip now:
  1. Vercel project f2k-projects -> repoint Supabase to the SYDNEY project
     (preferred: the Vercel<->Supabase integration: disconnect Seoul, connect $NewRef;
      fallback: manually overwrite the SUPABASE_*/POSTGRES_*/NEXT_PUBLIC_SUPABASE_* +
      SUPABASE_JWT_SECRET vars from .migration/sydney-keys.env, prod+preview, sensitive).
  2. Verify Sydney Auth: Site URL, redirect allow-list (/api/auth/callback + /api/auth/confirm),
     custom SMTP, and Google provider (if used).
  3. Leave REGISTRATIONS_PAUSED for now - the script clears it next.
"@

Info "clearing the freeze (REGISTRATIONS_PAUSED=false)..."
Set-RegistrationsPaused "false"
Ok "freeze flag cleared"
Gate "REDEPLOY f2k-projects production again so it (a) runs on Sydney and (b) re-opens the forms."

# =============================================================================
Section "GATE 4 - Smoke test (confirm the live app writes to Sydney)"
# =============================================================================
$code = Probe-RegisterStatus
if ($code -eq "400") { Ok "register endpoint open again (400 schema-reject on empty body = forms live)" }
elseif ($code -eq "503") { Warn "still 503 - the unpause redeploy may not be live yet" }
else { Warn "register endpoint returned HTTP $code" }

$before = PsqlScalar $DestUrl "select count(*) from public.branscombe_registrations"
Info "Sydney branscombe_registrations currently: $before"
Gate "Submit ONE real test registration through the LIVE site ($SiteUrl) so we can confirm it lands in Sydney."
$after = PsqlScalar $DestUrl "select count(*) from public.branscombe_registrations"
if ([int]$after -gt [int]$before) { Ok "CONFIRMED - the live app is writing to Sydney ($before -> $after)." }
else { Warn "no new row seen in Sydney ($before -> $after). If your test used another estate's form, check that table; otherwise the flip may not have taken." }

# =============================================================================
Section "CUTOVER COMPLETE - post-cutover tasks"
# =============================================================================
Write-Host @"
    The live site now runs on the Sydney project ($NewRef, ap-southeast-2).
    Agents/admins keep the SAME email + password; anyone logged in during the
    flip just signs in again once.

    Do soon:
      [ ] Smoke-test by hand: agent login, admin login, a confirm/reset email, a cron route.
      [ ] Repoint the CLI for future work:  npx supabase link --project-ref $NewRef
          and update the hardcoded ref in scripts/supabase-*.ps1 + CLAUDE.md.
      [ ] (optional) update .env.local POSTGRES_URL / NEXT_PUBLIC_SUPABASE_* for local dev.
      [ ] Delete the test registration you just submitted.

    Do after 24-48h of clean monitoring:
      [ ] Pause/decommission the Seoul project ($SourceRef) - keep one final backup first.
      [ ] Delete .migration/ (it holds PII dumps + secrets).
"@ -ForegroundColor Green
