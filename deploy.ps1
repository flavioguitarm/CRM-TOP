# ============================================================
# deploy.ps1 — CRM-TOP deploy completo para Google Cloud Run
# Uso: .\deploy.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ── Configurações fixas ──────────────────────────────────────
$IMAGE     = "us-west1-docker.pkg.dev/gen-lang-client-0491323320/crm-top/crm-top-formaturas:latest"
$REGION    = "us-west1"
$SERVICE   = "crm-top-formaturas"
$MEMORY    = "512Mi"
$ENV_FILE  = ".env.local"

# ── Helpers ──────────────────────────────────────────────────
function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "▶  $msg" -ForegroundColor Cyan
}

function Write-OK([string]$msg) {
    Write-Host "✔  $msg" -ForegroundColor Green
}

function Write-Fail([string]$msg) {
    Write-Host ""
    Write-Host "✖  ERRO: $msg" -ForegroundColor Red
    exit 1
}

# ── 0. Verificar pré-requisitos ──────────────────────────────
Write-Step "Verificando pré-requisitos..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "docker não encontrado. Instale o Docker Desktop."
}
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Fail "gcloud não encontrado. Instale o Google Cloud SDK."
}

Write-OK "docker e gcloud encontrados."

# ── 1. Ler variáveis do .env.local ───────────────────────────
Write-Step "Lendo variáveis de $ENV_FILE..."

if (-not (Test-Path $ENV_FILE)) {
    Write-Fail "Arquivo $ENV_FILE não encontrado na raiz do projeto."
}

$envVars = @{}
Get-Content $ENV_FILE | ForEach-Object {
    $line = $_.Trim()
    if ($line -ne "" -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            $envVars[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
}

$SUPABASE_URL      = $envVars["VITE_SUPABASE_URL"]
$SUPABASE_ANON_KEY = $envVars["VITE_SUPABASE_ANON_KEY"]

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Fail "VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados em $ENV_FILE."
}

Write-OK "VITE_SUPABASE_URL = $SUPABASE_URL"
Write-OK "VITE_SUPABASE_ANON_KEY = $($SUPABASE_ANON_KEY.Substring(0, 20))..."

# ── 2. Configurar Docker para Artifact Registry ──────────────
Write-Step "Configurando autenticação do Docker para Artifact Registry..."

gcloud auth configure-docker us-west1-docker.pkg.dev --quiet
if ($LASTEXITCODE -ne 0) { Write-Fail "Falha ao configurar autenticação do Docker." }

Write-OK "Docker autenticado no Artifact Registry."

# ── 3. Build da imagem Docker ────────────────────────────────
Write-Step "Construindo imagem Docker..."
Write-Host "   Imagem: $IMAGE" -ForegroundColor DarkGray
Write-Host "   Build args: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY" -ForegroundColor DarkGray

docker build `
    --build-arg "VITE_SUPABASE_URL=$SUPABASE_URL" `
    --build-arg "VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" `
    -t $IMAGE `
    .

if ($LASTEXITCODE -ne 0) { Write-Fail "Falha no docker build." }

Write-OK "Imagem construída com sucesso."

# ── 4. Push para Artifact Registry ──────────────────────────
Write-Step "Enviando imagem para Artifact Registry..."

docker push $IMAGE

if ($LASTEXITCODE -ne 0) { Write-Fail "Falha no docker push." }

Write-OK "Imagem enviada com sucesso."

# ── 5. Deploy no Cloud Run ───────────────────────────────────
Write-Step "Fazendo deploy no Cloud Run (service: $SERVICE, region: $REGION)..."

gcloud run deploy $SERVICE `
    --image $IMAGE `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --memory $MEMORY `
    --port 8080 `
    --quiet

if ($LASTEXITCODE -ne 0) { Write-Fail "Falha no gcloud run deploy." }

Write-OK "Deploy concluído."

# ── 6. Mostrar URL final ─────────────────────────────────────
Write-Step "Obtendo URL do serviço..."

$SERVICE_URL = gcloud run services describe $SERVICE `
    --region $REGION `
    --format "value(status.url)" `
    --quiet

if ($LASTEXITCODE -ne 0 -or -not $SERVICE_URL) {
    Write-Host "⚠  Não foi possível obter a URL automaticamente." -ForegroundColor Yellow
    Write-Host "   Acesse: https://console.cloud.google.com/run" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  🚀  Deploy realizado com sucesso!"             -ForegroundColor Green
    Write-Host "  🌐  URL: $SERVICE_URL"                         -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
}

Write-Host ""
