# Deploy do SGEM no Railway — Guia Completo

Tempo estimado: **10–15 minutos**.
Custo: **gratuito** (plano Hobby do Railway inclui $5/mês de crédito, suficiente para uso pessoal).

---

## O que você vai precisar

- Uma conta no **GitHub** (gratuita) → https://github.com
- Uma conta no **Railway** (gratuita) → https://railway.app

---

## PASSO 1 — Criar repositório no GitHub

1. Acesse https://github.com e faça login
2. Clique em **"New repository"** (botão verde no canto superior direito)
3. Preencha:
   - **Repository name:** `sgem`
   - **Visibility:** Private (recomendado — dados militares)
   - Deixe tudo o mais em branco
4. Clique em **"Create repository"**

Agora faça o upload dos arquivos:
1. Na página do repositório recém-criado, clique em **"uploading an existing file"**
2. Arraste **todos os arquivos e pastas** do projeto SGEM para a área de upload:
   ```
   sgem/
   ├── backend/
   │   └── server.js
   ├── frontend/
   │   └── index.html
   ├── package.json
   ├── railway.toml
   └── .gitignore
   ```
   > ⚠️ **Não suba:** `node_modules/`, `sgr.db`, `fotos/`
3. No campo "Commit changes", escreva: `primeiro commit`
4. Clique em **"Commit changes"**

---

## PASSO 2 — Criar projeto no Railway

1. Acesse https://railway.app e faça login (pode usar a conta do GitHub)
2. Clique em **"New Project"**
3. Escolha **"Deploy from GitHub repo"**
4. Autorize o Railway a acessar seu GitHub se pedido
5. Selecione o repositório `sgem`
6. O Railway detecta automaticamente que é Node.js e inicia o build

---

## PASSO 3 — Adicionar banco de dados PostgreSQL

1. No painel do projeto Railway, clique em **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Um banco PostgreSQL é criado e conectado automaticamente ao seu projeto
3. A variável de ambiente `DATABASE_URL` é injetada automaticamente — **você não precisa fazer nada**

---

## PASSO 4 — Verificar o deploy

1. Clique na aba **"Deployments"** do seu serviço
2. Aguarde o build terminar (ícone verde = sucesso)
3. Clique em **"Settings"** → **"Networking"** → **"Generate Domain"**
4. Railway vai gerar uma URL como: `sgem-production.up.railway.app`
5. Abra essa URL no navegador — o SGEM estará online!

---

## PASSO 5 — Verificar que está funcionando

Acesse `https://SUA-URL.railway.app/health`

Deve retornar:
```json
{"status":"ok","app":"SGEM","db":"postgres","recrutas":0}
```

Se aparecer `"db":"postgres"` — o banco de dados está conectado corretamente. ✅

---

## Atualizações futuras

Toda vez que você quiser atualizar o sistema (após receber um novo ZIP com melhorias):

1. Acesse seu repositório no GitHub
2. Navegue até o arquivo que mudou (ex: `frontend/index.html`)
3. Clique no ícone de lápis (editar) ou arraste o novo arquivo
4. Salve com "Commit changes"
5. O Railway faz o redeploy automaticamente em ~2 minutos

---

## Sobre as fotos

O Railway tem sistema de arquivos **temporário** — fotos enviadas somem a cada redeploy.

**Solução recomendada para fotos em produção:**
Use o **Cloudinary** (gratuito até 25GB):
1. Crie conta em https://cloudinary.com
2. Avise e implementamos o upload de fotos para a nuvem

Por enquanto, as fotos ficam funcionando localmente mas podem não persistir na nuvem.

---

## Acesso de múltiplos dispositivos

Com o deploy feito, o sistema fica acessível de **qualquer lugar**:
- Celular, tablet, computador
- Qualquer rede (não precisa estar na mesma Wi-Fi)
- URL fixa e permanente

---

## Segurança (recomendado após o deploy)

O sistema atual não tem autenticação por senha. Para proteger o acesso:

**Opção simples — Basic Auth no Railway:**
1. Em Settings → Variables, adicione:
   - `AUTH_USER` = nome de usuário que quiser
   - `AUTH_PASS` = senha que quiser
2. Avise que quer autenticação e implementamos em ~10 minutos

---

## Suporte

Se travar em qualquer etapa, descreva onde parou e continuamos.
