# Supabase SQL query script
# Usage: ./scripts/supabase-query.ps1 "SELECT * FROM table LIMIT 10"

param(
    [Parameter(Mandatory=$true)]
    [string]$Sql
)

$ErrorActionPreference = "Stop"

$ProjectRef = "earqebbwhklxadqawtex"

Write-Host "Running SQL on Supabase project: $ProjectRef"

# Run query via CLI - use --linked to connect to linked project
# Fallback to db-url from env
$DbUrl = $env:SUPABASE_DB_URL
if ($DbUrl) {
    npx supabase db query --db-url $DbUrl $Sql
} else {
    npx supabase db query --linked $Sql
}
