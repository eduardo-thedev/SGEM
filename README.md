# SGR – Sistema de Gestão de Recrutas 🪖

Dashboard de controle de efetivo militar — self-hosted, dados locais, zero mensalidade.

---

## ✅ Pré-requisito: Node.js

O SGR roda em cima do **Node.js**. Você precisa instalar **uma única vez**.

**Como instalar:**
1. Acesse **https://nodejs.org**
2. Clique no botão **"LTS"** (versão recomendada)
3. Baixe e instale normalmente (Next → Next → Finish)
4. **Reinicie o computador** após instalar

Para confirmar que instalou certo, abra o Prompt de Comando e digite:
```
node --version
```
Se aparecer algo como `v20.x.x`, está pronto.

---

## ⚡ Início em 1 clique

### Windows
Com o Node.js instalado: **duplo clique em `iniciar.bat`**

O que o script faz:
1. Verifica se Node.js está instalado — se não estiver, mostra instruções claras
2. Instala as dependências automaticamente (apenas na primeira execução, ~1 min)
3. Abre o navegador em `http://localhost:3030`

> **A janela preta do terminal deve ficar aberta** enquanto o SGR estiver rodando.
> Para encerrar o sistema, feche essa janela.

### macOS / Linux
```bash
chmod +x iniciar.sh
./iniciar.sh
```

---

## 📁 Estrutura

```
sgr/
├── backend/
│   └── server.js        ← Servidor Node.js (API + serve o frontend)
├── frontend/
│   └── index.html       ← Interface completa
├── fotos/               ← Fotos dos recrutas (criada automaticamente)
├── sgr.db               ← Banco de dados SQLite (criado automaticamente)
├── package.json         ← Dependências Node
├── iniciar.bat          ← Inicializador Windows
├── iniciar.sh           ← Inicializador Mac/Linux
└── README.md
```

---

## 🪖 Funcionalidades

### Painel
- Total de recrutas cadastrados
- LNCs ativas (dispensas vigentes agora)
- Contagem de FO+ e FO−
- Gráfico de desempenho por recruta (barras FO+/FO−)
- Lista de dispensas recentes/ativas com status
- Últimos recrutas cadastrados

### Listagem do Efetivo
- Vista em **lista** (tabela) ou **grade** (cards com foto)
- Busca por nome completo, nome de guerra, número ID, CPF, telefone
- Ordenação por nome, número ID ou data de cadastro
- Indicadores rápidos de FO e LNC por recruta
- Acesso rápido à ficha completa

### Ficha do Recruta (modal)
Contém todos os dados cadastrados:
- Foto
- Número ID, Nome Completo, Nome de Guerra
- Data de Nascimento, CPF, Telefone
- 2 Contatos de Emergência
- Título de Eleitor, Zona, Seção
- Histórico de LNCs com situação (Vigente / Vencida / Futura)
- Histórico de FOs (positivos e negativos)
- Ações: editar, adicionar LNC, adicionar FO, excluir

### Sem Dispensa – LNC
- Listagem de todas as LNCs com filtro por situação
- Status automático baseado na data atual:
  - **Vigente**: dispensa ativa hoje
  - **Vencida**: já passou
  - **Futura**: ainda não começou

### Fatos Observados – FO
- Listagem de todos os FOs com filtro por tipo
- FO+ (Fato Observado Positivo)
- FO− (Fato Observado Negativo)

---

## 💾 Backup

Todos os dados ficam em dois lugares:
- `sgr.db` → banco de dados (recrutas, LNCs, FOs)
- `fotos/`  → pasta com as fotos dos recrutas

**Para backup completo:** copie a pasta `sgr/` inteira para outro local.

```bash
# Backup rápido (Windows)
xcopy /E /I C:\sgr D:\Backup\sgr_%date:~6,4%%date:~3,2%%date:~0,2%

# Backup rápido (Mac/Linux)
cp -r ~/sgr ~/Backups/sgr_$(date +%Y%m%d)
```

---

## 🌐 API – Endpoints

Com o servidor rodando, todos os endpoints abaixo estão disponíveis:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/recrutas` | Lista recrutas (filtro: busca, order) |
| GET | `/api/recrutas/:id` | Ficha completa (com LNC e FO) |
| POST | `/api/recrutas` | Cadastra novo recruta |
| PATCH | `/api/recrutas/:id` | Atualiza dados do recruta |
| DELETE | `/api/recrutas/:id` | Remove recruta |
| POST | `/api/recrutas/:id/foto` | Upload de foto |
| GET | `/api/lnc` | Lista todas as LNCs |
| POST | `/api/recrutas/:id/lnc` | Registra LNC para um recruta |
| DELETE | `/api/lnc/:id` | Remove uma LNC |
| POST | `/api/recrutas/:id/fatos` | Registra FO |
| DELETE | `/api/fatos/:id` | Remove um FO |
| GET | `/api/dashboard` | Dados do painel |
| GET | `/health` | Health check |

---

## 🔧 Problemas Comuns

**"Porta 3030 já em uso"**
```bat
:: Windows
netstat -ano | findstr :3030
taskkill /PID <numero> /F
```
```bash
# Mac/Linux
lsof -ti:3030 | xargs kill
```

**Erro ao instalar better-sqlite3**

Em alguns casos o `better-sqlite3` precisa compilar código nativo. Se falhar:
```bash
npm install --build-from-source
# ou instale as build tools:
# Windows: npm install --global windows-build-tools
# Linux:   sudo apt install build-essential
```

**Foto não aparece**

Verifique se a pasta `fotos/` existe na raiz do projeto e se o servidor tem permissão de escrita.

**Abrir de outro dispositivo na rede**

O servidor já está configurado para aceitar conexões externas (`0.0.0.0`).
Descubra seu IP local e acesse `http://SEU_IP:3030` de qualquer dispositivo na mesma rede.

---

## 🚀 Iniciar Automaticamente com o Windows

1. Pressione `Win + R` → digite `shell:startup` → Enter
2. Crie um atalho do `iniciar.bat` nessa pasta
3. Pronto — o SGR inicia junto com o Windows

---

## 📋 Dados que o Sistema Gerencia

| Campo | Descrição |
|-------|-----------|
| Número ID | Identificador único do recruta |
| Nome Completo | Nome civil completo |
| Nome de Guerra | Nome de uso militar |
| Data de Nascimento | Para controle de idade |
| CPF | Documento de identificação |
| Telefone | Contato direto |
| Contato 1 e 2 | Familiares/emergência (nome + telefone) |
| Título de Eleitor | Número, Zona e Seção |
| Foto | Imagem do recruta |
| LNC | Licença Não Concedida (data início, término, motivo, situação) |
| FO+ | Fato Observado Positivo (data + descrição) |
| FO− | Fato Observado Negativo (data + descrição) |

---

*SGR v1.0 — Sistema de controle de efetivo para uso operacional.*
