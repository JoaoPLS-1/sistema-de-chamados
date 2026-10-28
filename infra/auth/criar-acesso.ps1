$ErrorActionPreference = 'Stop'
$OutputEncoding = New-Object Text.UTF8Encoding($false)
$projeto = (Resolve-Path (Join-Path $PSScriptRoot '../../orm-basico')).Path
if (-not (Test-Path -LiteralPath (Join-Path $projeto 'dist/scripts/criar-acesso.js'))) {
    throw 'Execute npm run build em orm-basico antes de criar o acesso.'
}
$nome = Read-Host 'Nome (para cadastro novo)'
$email = Read-Host 'E-mail'
$tipo = Read-Host 'Tipo (TECNICO ou SOLICITANTE; preservado se a pessoa ja existir)'
$senhaSegura = Read-Host 'Senha (8 a 128 caracteres)' -AsSecureString
$ponteiro = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaSegura)
try {
    $dados = @{
        nome = $nome
        email = $email
        tipo = $tipo
        senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiro)
    } | ConvertTo-Json -Compress
    Push-Location $projeto
    try {
        $dados | node dist/scripts/criar-acesso.js
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar acesso.' }
    } finally { Pop-Location }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiro)
    $dados = $null
    $senhaSegura.Dispose()
}
