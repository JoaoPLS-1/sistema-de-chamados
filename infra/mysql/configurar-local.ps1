param(
    [string]$MySqlBase = 'C:\Program Files\MySQL\MySQL Server 8.4'
)
$ErrorActionPreference = 'Stop'
$projeto = (Resolve-Path (Join-Path $PSScriptRoot '../../orm-basico')).Path
$ambiente = Join-Path $projeto '.env'
$local = Join-Path $env:LOCALAPPDATA 'SistemaChamados/mysql'
$dados = Join-Path $local 'data'
$config = Join-Path $local 'my.ini'
$cliente = Join-Path $local 'root-client.ini'
$bootstrap = Join-Path $local 'bootstrap.sql'
$mysqld = Join-Path $MySqlBase 'bin/mysqld.exe'
$mysql = Join-Path $MySqlBase 'bin/mysql.exe'
$mysqladmin = Join-Path $MySqlBase 'bin/mysqladmin.exe'
$servico = 'SistemaChamadosMySQL84'
$identidade = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identidade)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Execute este script em um PowerShell como administrador para registrar o servico.'
}
if (-not (Test-Path -LiteralPath $mysqld)) { throw 'Instale Oracle.MySQL 8.4 pelo winget antes de configurar.' }
if ((Test-Path -LiteralPath $ambiente) -or (Test-Path -LiteralPath (Join-Path $projeto '.env.test')) -or (Test-Path -LiteralPath $dados) -or (Get-Service -Name $servico -ErrorAction SilentlyContinue)) {
    throw 'Ja existe configuracao local, banco ou servico. Nenhum dado foi sobrescrito; revise o ambiente existente.'
}
$testePorta = New-Object Net.Sockets.TcpClient
try {
    try { $testePorta.Connect('127.0.0.1', 3306); throw 'A porta 3306 ja esta ocupada. Nenhum banco foi alterado.' }
    catch [Net.Sockets.SocketException] { }
} finally { $testePorta.Dispose() }

function Gravar-Utf8([string]$caminho, [string]$conteudo) {
    [IO.File]::WriteAllText($caminho, $conteudo, (New-Object Text.UTF8Encoding($false)))
}
function Nova-Senha {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes); return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant() }
    finally { $rng.Dispose() }
}

New-Item -ItemType Directory -Path $local -Force | Out-Null
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in @($identidade.User, (New-Object Security.Principal.SecurityIdentifier('S-1-5-18')), (New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))) {
    $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
}
Set-Acl -LiteralPath $local -AclObject $acl
$senhaRoot = Nova-Senha
$senhaApp = Nova-Senha
$baseIni = $MySqlBase.Replace('\', '/')
$dadosIni = $dados.Replace('\', '/')
$erroIni = (Join-Path $local 'mysql-error.log').Replace('\', '/')
Gravar-Utf8 $config @"
[mysqld]
basedir="$baseIni"
datadir="$dadosIni"
port=3306
bind-address=127.0.0.1
mysqlx=0
character-set-server=utf8mb4
collation-server=utf8mb4_0900_ai_ci
log-error="$erroIni"
"@
Gravar-Utf8 $cliente @"
[client]
user=root
password=$senhaRoot
host=127.0.0.1
port=3306
protocol=TCP
"@
Gravar-Utf8 $bootstrap @"
ALTER USER 'root'@'localhost' IDENTIFIED BY '$senhaRoot';
CREATE DATABASE tarefas CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE tarefas_teste CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'tarefas_app'@'localhost' IDENTIFIED BY '$senhaApp';
GRANT ALL PRIVILEGES ON tarefas.* TO 'tarefas_app'@'localhost';
GRANT ALL PRIVILEGES ON tarefas_teste.* TO 'tarefas_app'@'localhost';
"@

$iniciado = $null
try {
    $inicializacao = Start-Process -FilePath $mysqld -ArgumentList @("--defaults-file=`"$config`"", '--initialize-insecure', '--console') -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $local 'initialize-out.log') -RedirectStandardError (Join-Path $local 'initialize-error.log')
    if ($inicializacao.ExitCode -ne 0) { throw 'Falha ao inicializar o diretorio de dados. Confira initialize-error.log.' }
    $argumentos = @("--defaults-file=`"$config`"", "--init-file=`"$bootstrap`"", '--console')
    $iniciado = Start-Process -FilePath $mysqld -ArgumentList $argumentos -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $local 'bootstrap-out.log') -RedirectStandardError (Join-Path $local 'bootstrap-error.log')
    $pronto = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 1
        if ($iniciado.HasExited) { throw 'Servidor encerrou durante a configuracao. Confira os logs locais.' }
        try { & $mysql "--defaults-extra-file=$cliente" --connect-timeout=1 --execute='SELECT 1' 2>$null | Out-Null }
        catch { continue }
        if ($LASTEXITCODE -eq 0) { $pronto = $true; break }
    }
    if (-not $pronto) { throw 'MySQL nao respondeu no prazo esperado.' }
    & $mysqladmin "--defaults-extra-file=$cliente" shutdown
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel encerrar a inicializacao do MySQL.' }
    $iniciado.WaitForExit()
    & $mysqld --install $servico "--defaults-file=$config"
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao registrar o servico MySQL.' }
    Start-Service -Name $servico
    Gravar-Utf8 $ambiente "DATABASE_URL=`"mysql://tarefas_app:$senhaApp@127.0.0.1:3306/tarefas`"`n"
    Gravar-Utf8 (Join-Path $projeto '.env.test') "DATABASE_URL=`"mysql://tarefas_app:$senhaApp@127.0.0.1:3306/tarefas_teste`"`n"
    Write-Output "MySQL configurado. Servico: $servico. Bancos: tarefas e tarefas_teste. Credenciais root: $cliente. Senhas nao exibidas."
} finally {
    if ($iniciado -and -not $iniciado.HasExited) {
        & $mysqladmin "--defaults-extra-file=$cliente" shutdown 2>$null | Out-Null
    }
    if (Test-Path -LiteralPath $bootstrap) { Remove-Item -LiteralPath $bootstrap }
    $senhaRoot = $null
    $senhaApp = $null
}
