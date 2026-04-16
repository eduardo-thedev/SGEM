#!/bin/bash
# SGR – Script de inicialização (macOS / Linux)

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "\n${CYAN}${BOLD} ================================================="
echo "   SGR – Sistema de Gestão de Recrutas"
echo -e " =================================================${NC}\n"

cd "$(dirname "$0")"

# ── Verifica Node.js ──────────────────────────────────
if ! command -v node &>/dev/null; then
    echo -e "${RED}[!] Node.js não encontrado. Tentando instalar...${NC}"

    # macOS: Homebrew
    if command -v brew &>/dev/null; then
        echo "Instalando via Homebrew..."
        brew install node
    # Linux: curl | bash (nvm)
    elif command -v curl &>/dev/null; then
        echo "Instalando via nvm..."
        curl -fsSL https://fnm.vercel.app/install | bash
        export PATH="$HOME/.local/share/fnm:$PATH"
        eval "$(fnm env)"
        fnm install 20
        fnm use 20
    else
        echo -e "${RED}[ERRO] Instale Node.js manualmente: https://nodejs.org${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}[OK] Node.js $(node --version) encontrado.${NC}"

# ── Instala dependências ──────────────────────────────
if [ ! -d "node_modules/better-sqlite3" ]; then
    echo -e "${GREEN}[2/3] Instalando dependências (única vez)...${NC}"
    npm install --silent 2>/dev/null || npm install
fi

echo -e "${GREEN}[3/3] Iniciando SGR em http://localhost:3030${NC}"
echo -e "\n Para encerrar: Ctrl+C\n"

# Abre navegador
(sleep 2 && (open "http://localhost:3030" 2>/dev/null || xdg-open "http://localhost:3030" 2>/dev/null)) &

node backend/server.js
