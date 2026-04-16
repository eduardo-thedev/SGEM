@echo off
setlocal
title SGR - Sistema de Gestao de Recrutas
color 0A
cd /d "%~dp0"

echo.
echo  ============================================================
echo   SGR - Sistema de Gestao de Recrutas
echo  ============================================================
echo.

:: ── 1. Verifica Node.js ──────────────────────────────────────
echo  Verificando dependencias...
echo.

where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERRO] Node.js nao encontrado no seu computador.
    echo.
    echo  Para instalar o Node.js:
    echo.
    echo    1. Abra o navegador
    echo    2. Acesse:  https://nodejs.org
    echo    3. Clique no botao "LTS" e instale normalmente
    echo    4. Reinicie o computador apos instalar
    echo    5. Execute este arquivo novamente
    echo.
    echo  ============================================================
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version 2^>^&1') do set NODE_VER=%%v
echo  [OK] Node.js encontrado: %NODE_VER%

:: ── 2. Verifica npm ──────────────────────────────────────────
where npm >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo  [ERRO] npm nao encontrado.
    echo  Reinstale o Node.js em: https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm --version 2^>^&1') do set NPM_VER=%%v
echo  [OK] npm encontrado: v%NPM_VER%

:: ── 3. Instala dependencias se necessario ────────────────────
if not exist "node_modules\sql.js\package.json" (
    echo.
    echo  [..] Instalando dependencias pela primeira vez...
    echo       Aguarde, pode levar 1-2 minutos.
    echo.
    call npm install
    if errorlevel 1 (
        color 0C
        echo.
        echo  [ERRO] Falha ao instalar dependencias.
        echo.
        echo  Possiveis causas e solucoes:
        echo    - Sem internet: conecte e tente novamente
        echo    - Antivirus bloqueando: desative temporariamente
        echo    - Sem permissao: clique com botao direito no
        echo      iniciar.bat e escolha "Executar como administrador"
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencias instaladas com sucesso.
) else (
    echo  [OK] Dependencias ja instaladas.
)

:: ── 4. Inicia o servidor ─────────────────────────────────────
echo.
echo  ============================================================
echo   SGR iniciando...
echo   Acesse no navegador:  http://localhost:3030
echo.
echo   Para ENCERRAR o sistema: feche esta janela
echo  ============================================================
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3030"

node backend\server.js

:: Se o node encerrar por qualquer motivo, nao fecha a janela
echo.
echo  ============================================================
echo  [!] O servidor foi encerrado.
echo.
echo  Se ocorreu um erro, leia a mensagem acima.
echo  Para reiniciar, feche esta janela e execute iniciar.bat novamente.
echo  ============================================================
echo.
pause
