// SGEM – Sistema de Gestão do Efetivo Militar
// Banco: SQLite (local, sem DATABASE_URL) ou PostgreSQL (produção, com DATABASE_URL)

"use strict";
const http = require("http");
const fs   = require("fs");
const path = require("path");

const ROOT  = path.join(__dirname, "..");
const FOTOS = path.join(ROOT, "fotos");
const FRONT = path.join(ROOT, "frontend");

if (!fs.existsSync(FOTOS)) fs.mkdirSync(FOTOS, { recursive: true });

const USE_PG = !!process.env.DATABASE_URL;
console.log(`[DB] Modo: ${USE_PG ? "PostgreSQL (produção)" : "SQLite (local)"}`);

// ══════════════════════════════════════════════
//  POSTGRESQL
// ══════════════════════════════════════════════
let pgPool;

async function initPg() {
  const { Pool } = require("pg");
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS recrutas (
      id SERIAL PRIMARY KEY, numero_id TEXT UNIQUE,
      nome_completo TEXT NOT NULL, nome_guerra TEXT NOT NULL,
      data_nascimento TEXT, cpf TEXT, telefone TEXT,
      contato1_nome TEXT, contato1_parentesco TEXT, contato1_tel TEXT,
      contato2_nome TEXT, contato2_parentesco TEXT, contato2_tel TEXT,
      titulo_eleitor TEXT, zona TEXT, secao TEXT,
      foto_path TEXT, criado_em TEXT, atualizado_em TEXT
    );
    CREATE TABLE IF NOT EXISTS lnc (
      id SERIAL PRIMARY KEY,
      recruta_id INTEGER NOT NULL REFERENCES recrutas(id) ON DELETE CASCADE,
      data_inicio TEXT NOT NULL, data_fim TEXT NOT NULL, motivo TEXT, criado_em TEXT
    );
    CREATE TABLE IF NOT EXISTS fatos (
      id SERIAL PRIMARY KEY,
      recruta_id INTEGER NOT NULL REFERENCES recrutas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL, descricao TEXT NOT NULL, data TEXT NOT NULL, criado_em TEXT
    );
  `);
  console.log("[DB] PostgreSQL: tabelas verificadas.");
}

function namedToPg(sql, params) {
  if (Array.isArray(params)) return { q: sql, vals: params };
  const vals = [];
  const q = sql.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    const v = params["$" + name];
    vals.push(v !== undefined ? v : null);
    return "$" + vals.length;
  });
  return { q, vals };
}

async function pgRun(sql, params = []) {
  const { q, vals } = namedToPg(sql, params);
  const hasReturning = /^\s*(INSERT|UPDATE)/i.test(q);
  const finalQ = hasReturning ? q + " RETURNING *" : q;
  const r = await pgPool.query(finalQ, vals);
  return { lastInsertRowid: r.rows[0]?.id, row: r.rows[0] };
}

async function pgAll(sql, params = []) {
  const { q, vals } = namedToPg(sql, params);
  return (await pgPool.query(q, vals)).rows;
}

async function pgGet(sql, params = []) {
  return (await pgAll(sql, params))[0] || null;
}

// ══════════════════════════════════════════════
//  SQLITE
// ══════════════════════════════════════════════
const DBFILE = path.join(ROOT, "sgr.db");
let DB, _dirty = false;

async function initSqlite() {
  const SQL = await require("sql.js")();
  DB = fs.existsSync(DBFILE)
    ? new SQL.Database(fs.readFileSync(DBFILE))
    : new SQL.Database();
  DB.run("PRAGMA foreign_keys = ON");
  DB.run(`
    CREATE TABLE IF NOT EXISTS recrutas (
      id INTEGER PRIMARY KEY AUTOINCREMENT, numero_id TEXT UNIQUE,
      nome_completo TEXT NOT NULL, nome_guerra TEXT NOT NULL,
      data_nascimento TEXT, cpf TEXT, telefone TEXT,
      contato1_nome TEXT, contato1_parentesco TEXT, contato1_tel TEXT,
      contato2_nome TEXT, contato2_parentesco TEXT, contato2_tel TEXT,
      titulo_eleitor TEXT, zona TEXT, secao TEXT,
      foto_path TEXT, criado_em TEXT, atualizado_em TEXT
    );
    CREATE TABLE IF NOT EXISTS lnc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recruta_id INTEGER NOT NULL REFERENCES recrutas(id) ON DELETE CASCADE,
      data_inicio TEXT NOT NULL, data_fim TEXT NOT NULL, motivo TEXT, criado_em TEXT
    );
    CREATE TABLE IF NOT EXISTS fatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recruta_id INTEGER NOT NULL REFERENCES recrutas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL, descricao TEXT NOT NULL, data TEXT NOT NULL, criado_em TEXT
    );
  `);
  const cols = DB.exec("PRAGMA table_info(recrutas)")[0]?.values.map(r => r[1]) || [];
  if (!cols.includes("contato1_parentesco")) DB.run("ALTER TABLE recrutas ADD COLUMN contato1_parentesco TEXT");
  if (!cols.includes("contato2_parentesco")) DB.run("ALTER TABLE recrutas ADD COLUMN contato2_parentesco TEXT");
  save();
  setInterval(() => { if (_dirty) save(); }, 2000);
}

function save() { fs.writeFileSync(DBFILE, Buffer.from(DB.export())); _dirty = false; }

function sqRun(sql, params = []) {
  DB.run(sql, params); _dirty = true;
  return { lastInsertRowid: DB.exec("SELECT last_insert_rowid() AS id")[0]?.values[0][0] };
}
function sqAll(sql, params = []) {
  const res = DB.exec(sql, params);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}
function sqGet(sql, params = []) { return sqAll(sql, params)[0] || null; }

// ══════════════════════════════════════════════
//  API UNIFICADA
// ══════════════════════════════════════════════
async function dbRun(sql, p)  { return USE_PG ? pgRun(sql, p)  : sqRun(sql, p); }
async function dbAll(sql, p)  { return USE_PG ? pgAll(sql, p)  : sqAll(sql, p); }
async function dbGet(sql, p)  { return USE_PG ? pgGet(sql, p)  : sqGet(sql, p); }

// ══════════════════════════════════════════════
//  HTTP HELPERS
// ══════════════════════════════════════════════
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function json(res, data, s = 200) {
  res.writeHead(s, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(data));
}
function errRes(res, msg, s = 400) { json(res, { error: msg }, s); }

function readBody(req) {
  return new Promise((ok, fail) => {
    const c = [];
    req.on("data", d => c.push(d));
    req.on("end",  () => { try { ok(JSON.parse(Buffer.concat(c).toString() || "{}")); } catch { ok({}); } });
    req.on("error", fail);
  });
}
function readRaw(req) {
  return new Promise((ok, fail) => {
    const c = [];
    req.on("data", d => c.push(d));
    req.on("end",  () => ok(Buffer.concat(c)));
    req.on("error", fail);
  });
}

function parseMime(buf, boundary) {
  const sep = Buffer.from("--" + boundary);
  const parts = [];
  let pos = buf.indexOf(sep) + sep.length + 2;
  while (pos < buf.length) {
    const end = buf.indexOf(sep, pos);
    if (end === -1) break;
    const part = buf.slice(pos, end - 2);
    const hEnd = part.indexOf("\r\n\r\n");
    if (hEnd === -1) { pos = end + sep.length + 2; continue; }
    const headers = part.slice(0, hEnd).toString();
    const data    = part.slice(hEnd + 4);
    const nameM   = headers.match(/name="([^"]+)"/);
    const fileM   = headers.match(/filename="([^"]+)"/);
    if (nameM) parts.push({ name: nameM[1], filename: fileM?.[1] || null, data });
    pos = end + sep.length + 2;
  }
  return parts;
}

function serveStatic(res, fp) {
  const types = { ".html":"text/html",".css":"text/css",".js":"application/javascript",
    ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",
    ".ico":"image/x-icon",".svg":"image/svg+xml" };
  try {
    res.writeHead(200, { "Content-Type": types[path.extname(fp)] || "application/octet-stream", ...CORS });
    res.end(fs.readFileSync(fp));
  } catch { res.writeHead(404, CORS); res.end("Not found"); }
}

function nowStr() { return new Date().toLocaleString("pt-BR", { hour12:false }).replace(",",""); }
function today()  { return new Date().toISOString().split("T")[0]; }
function vigencia(ini, fim) {
  const t = today();
  return t < ini ? "futura" : t > fim ? "vencida" : "vigente";
}

// ══════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════
async function handle(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname, m = req.method;

  if (m === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }

  // GET /api/recrutas
  if (m === "GET" && p === "/api/recrutas") {
    const like  = `%${u.searchParams.get("busca") || ""}%`;
    const order = ["nome_completo","nome_guerra","numero_id","criado_em"].includes(u.searchParams.get("order"))
      ? u.searchParams.get("order") : "nome_completo";
    const rows = await dbAll(
      `SELECT r.*,
        (SELECT COUNT(*) FROM lnc   WHERE recruta_id=r.id) AS qtd_lnc,
        (SELECT COUNT(*) FROM fatos WHERE recruta_id=r.id AND tipo='positivo') AS fo_pos,
        (SELECT COUNT(*) FROM fatos WHERE recruta_id=r.id AND tipo='negativo') AS fo_neg
       FROM recrutas r
       WHERE r.nome_completo LIKE $like OR r.nome_guerra LIKE $like
          OR r.numero_id LIKE $like OR r.cpf LIKE $like OR r.telefone LIKE $like
       ORDER BY ${order} ASC`,
      { $like: like }
    );
    return json(res, rows);
  }

  // GET /api/recrutas/:id
  if (m === "GET" && /^\/api\/recrutas\/\d+$/.test(p)) {
    const id = +p.split("/")[3];
    const row = await dbGet("SELECT * FROM recrutas WHERE id=$id", { $id: id });
    if (!row) return errRes(res, "Não encontrado", 404);
    row.lnc   = (await dbAll("SELECT * FROM lnc   WHERE recruta_id=$id ORDER BY data_inicio DESC", { $id: id }))
                  .map(l => ({ ...l, vigencia: vigencia(l.data_inicio, l.data_fim) }));
    row.fatos = await dbAll("SELECT * FROM fatos WHERE recruta_id=$id ORDER BY data DESC", { $id: id });
    return json(res, row);
  }

  // POST /api/recrutas
  if (m === "POST" && p === "/api/recrutas") {
    const d = await readBody(req);
    if (!d.nome_completo || !d.nome_guerra) return errRes(res, "nome_completo e nome_guerra são obrigatórios");
    if (!d.numero_id) {
      const count = +(await dbGet("SELECT COUNT(*) AS n FROM recrutas")).n;
      let cand = String(count + 1).padStart(3, "0"), tries = 0;
      while (await dbGet("SELECT id FROM recrutas WHERE numero_id=$n", { $n: cand }) && tries < 9999)
        cand = String(count + 1 + ++tries).padStart(3, "0");
      d.numero_id = cand;
    }
    try {
      const r = await dbRun(
        `INSERT INTO recrutas (numero_id,nome_completo,nome_guerra,data_nascimento,cpf,telefone,
           contato1_nome,contato1_parentesco,contato1_tel,contato2_nome,contato2_parentesco,contato2_tel,
           titulo_eleitor,zona,secao,criado_em)
         VALUES ($a,$b,$c,$d,$e,$f,$g,$h,$i,$j,$k,$l,$m,$n,$o,$p)`,
        { $a:d.numero_id,$b:d.nome_completo,$c:d.nome_guerra,$d:d.data_nascimento||null,
          $e:d.cpf||null,$f:d.telefone||null,$g:d.contato1_nome||null,$h:d.contato1_parentesco||null,
          $i:d.contato1_tel||null,$j:d.contato2_nome||null,$k:d.contato2_parentesco||null,
          $l:d.contato2_tel||null,$m:d.titulo_eleitor||null,$n:d.zona||null,$o:d.secao||null,$p:nowStr() }
      );
      const saved = r.row || await dbGet("SELECT * FROM recrutas WHERE id=$id", { $id: r.lastInsertRowid });
      return json(res, saved, 201);
    } catch(e) {
      return errRes(res, String(e).match(/unique/i) ? "Número ID já cadastrado" : String(e));
    }
  }

  // PATCH /api/recrutas/:id
  if (m === "PATCH" && /^\/api\/recrutas\/\d+$/.test(p)) {
    const id = +p.split("/")[3];
    const d  = await readBody(req);
    const allowed = ["numero_id","nome_completo","nome_guerra","data_nascimento","cpf","telefone",
                     "contato1_nome","contato1_parentesco","contato1_tel",
                     "contato2_nome","contato2_parentesco","contato2_tel","titulo_eleitor","zona","secao"];
    const campos = allowed.filter(f => f in d);
    if (!campos.length) return errRes(res, "Nenhum campo enviado");
    const params = { $id: id, $atualizado_em: nowStr() };
    campos.forEach(f => params[`$${f}`] = d[f]);
    try {
      await dbRun(`UPDATE recrutas SET ${campos.map(f=>`${f}=$${f}`).join(",")} ,atualizado_em=$atualizado_em WHERE id=$id`, params);
      return json(res, await dbGet("SELECT * FROM recrutas WHERE id=$id", { $id: id }));
    } catch(e) { return errRes(res, String(e)); }
  }

  // DELETE /api/recrutas/:id
  if (m === "DELETE" && /^\/api\/recrutas\/\d+$/.test(p)) {
    const id = +p.split("/")[3];
    const r  = await dbGet("SELECT foto_path FROM recrutas WHERE id=$id", { $id: id });
    if (r?.foto_path) try { fs.unlinkSync(path.join(FOTOS, r.foto_path)); } catch {}
    await dbRun("DELETE FROM recrutas WHERE id=$id", { $id: id });
    res.writeHead(204, CORS); res.end(); return;
  }

  // POST /api/recrutas/:id/foto
  if (m === "POST" && /^\/api\/recrutas\/\d+\/foto$/.test(p)) {
    const id  = +p.split("/")[3];
    const bnd = (req.headers["content-type"] || "").split("boundary=")[1]?.trim();
    if (!bnd) return errRes(res, "Multipart necessário");
    const foto = parseMime(await readRaw(req), bnd).find(pt => pt.name === "foto");
    if (!foto) return errRes(res, "Campo 'foto' não encontrado");
    const ext  = (foto.filename || "foto.jpg").split(".").pop().toLowerCase().replace(/[^a-z]/g,"") || "jpg";
    const name = `${id}_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(FOTOS, name), foto.data);
    await dbRun("UPDATE recrutas SET foto_path=$n WHERE id=$id", { $n: name, $id: id });
    return json(res, { foto_path: name });
  }

  // GET /api/lnc
  if (m === "GET" && p === "/api/lnc") {
    const rows = (await dbAll(
      `SELECT l.*,r.nome_completo,r.nome_guerra,r.numero_id FROM lnc l
       JOIN recrutas r ON r.id=l.recruta_id ORDER BY l.data_inicio DESC`
    )).map(l => ({ ...l, vigencia: vigencia(l.data_inicio, l.data_fim) }));
    return json(res, rows);
  }

  // POST /api/recrutas/:id/lnc
  if (m === "POST" && /^\/api\/recrutas\/\d+\/lnc$/.test(p)) {
    const id = +p.split("/")[3];
    const d  = await readBody(req);
    if (!d.data_inicio || !d.data_fim) return errRes(res, "data_inicio e data_fim obrigatórios");
    const r = await dbRun(
      "INSERT INTO lnc (recruta_id,data_inicio,data_fim,motivo,criado_em) VALUES ($a,$b,$c,$d,$e)",
      { $a:id,$b:d.data_inicio,$c:d.data_fim,$d:d.motivo||null,$e:nowStr() }
    );
    const row = r.row || await dbGet("SELECT * FROM lnc WHERE id=$id", { $id: r.lastInsertRowid });
    return json(res, { ...row, vigencia: vigencia(row.data_inicio, row.data_fim) }, 201);
  }

  // DELETE /api/lnc/:id
  if (m === "DELETE" && /^\/api\/lnc\/\d+$/.test(p)) {
    await dbRun("DELETE FROM lnc WHERE id=$id", { $id: +p.split("/")[3] });
    res.writeHead(204, CORS); res.end(); return;
  }

  // POST /api/recrutas/:id/fatos
  if (m === "POST" && /^\/api\/recrutas\/\d+\/fatos$/.test(p)) {
    const id = +p.split("/")[3];
    const d  = await readBody(req);
    if (!d.tipo || !d.descricao || !d.data) return errRes(res, "tipo, descricao e data obrigatórios");
    const r = await dbRun(
      "INSERT INTO fatos (recruta_id,tipo,descricao,data,criado_em) VALUES ($a,$b,$c,$d,$e)",
      { $a:id,$b:d.tipo,$c:d.descricao,$d:d.data,$e:nowStr() }
    );
    const row = r.row || await dbGet("SELECT * FROM fatos WHERE id=$id", { $id: r.lastInsertRowid });
    return json(res, row, 201);
  }

  // DELETE /api/fatos/:id
  if (m === "DELETE" && /^\/api\/fatos\/\d+$/.test(p)) {
    await dbRun("DELETE FROM fatos WHERE id=$id", { $id: +p.split("/")[3] });
    res.writeHead(204, CORS); res.end(); return;
  }

  // GET /api/dashboard
  if (m === "GET" && p === "/api/dashboard") {
    const t       = today();
    const total   = +(await dbGet("SELECT COUNT(*) AS n FROM recrutas")).n;
    const lncQ    = USE_PG
      ? [`SELECT COUNT(*) AS n FROM lnc WHERE $1::date BETWEEN data_inicio::date AND data_fim::date`, [t]]
      : [`SELECT COUNT(*) AS n FROM lnc WHERE '${t}' BETWEEN data_inicio AND data_fim`, []];
    const lncAtivas = +(await dbGet(...lncQ)).n;
    const foPos   = +(await dbGet("SELECT COUNT(*) AS n FROM fatos WHERE tipo='positivo'")).n;
    const foNeg   = +(await dbGet("SELECT COUNT(*) AS n FROM fatos WHERE tipo='negativo'")).n;
    const recentes = await dbAll("SELECT nome_completo,nome_guerra,numero_id,criado_em FROM recrutas ORDER BY criado_em DESC LIMIT 5");
    const lncSQL  = USE_PG
      ? [`SELECT l.data_inicio,l.data_fim,l.motivo,r.nome_completo,r.nome_guerra,r.numero_id FROM lnc l JOIN recrutas r ON r.id=l.recruta_id WHERE l.data_fim::date >= ($1::date - interval '7 days') ORDER BY l.data_fim ASC LIMIT 10`, [t]]
      : [`SELECT l.data_inicio,l.data_fim,l.motivo,r.nome_completo,r.nome_guerra,r.numero_id FROM lnc l JOIN recrutas r ON r.id=l.recruta_id WHERE l.data_fim >= date('${t}','-7 days') ORDER BY l.data_fim ASC LIMIT 10`, []];
    const lncList = (await dbAll(...lncSQL)).map(l => ({ ...l, vigencia: vigencia(l.data_inicio, l.data_fim) }));
    const porFO   = await dbAll(
      `SELECT r.nome_guerra, SUM(CASE WHEN f.tipo='positivo' THEN 1 ELSE 0 END) AS pos,
         SUM(CASE WHEN f.tipo='negativo' THEN 1 ELSE 0 END) AS neg
       FROM recrutas r LEFT JOIN fatos f ON f.recruta_id=r.id
       GROUP BY r.id, r.nome_guerra ORDER BY (pos-neg) DESC LIMIT 8`
    );
    return json(res, { total, lncAtivas, foPos, foNeg, recentes, lncList, porFO });
  }

  if (m === "GET" && p.startsWith("/fotos/"))
    return serveStatic(res, path.join(FOTOS, decodeURIComponent(p.slice(7))));

  if (m === "GET" && p === "/health") {
    const n = +(await dbGet("SELECT COUNT(*) AS n FROM recrutas")).n;
    return json(res, { status:"ok", app:"SGEM", db: USE_PG ? "postgres" : "sqlite", recrutas: n });
  }

  if (m === "GET") {
    const file = (p==="/"||p==="/index.html") ? path.join(FRONT,"index.html") : path.join(FRONT,p);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return serveStatic(res, file);
    return serveStatic(res, path.join(FRONT, "index.html"));
  }

  res.writeHead(404, CORS); res.end("Not found");
}

// ══════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════
(async () => {
  USE_PG ? await initPg() : await initSqlite();
  const PORT = process.env.PORT || 3030;
  http.createServer(async (req, res) => {
    try { await handle(req, res); }
    catch(e) { console.error("[ERRO]", e.message); try { errRes(res, "Erro interno", 500); } catch {} }
  }).listen(PORT, "0.0.0.0", () => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  SGEM – Gestão do Efetivo Militar        ║`);
    console.log(`║  http://localhost:${PORT}                     ║`);
    console.log(`║  Banco: ${USE_PG ? "PostgreSQL (nuvem)   " : "SQLite    (local)   "}           ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);
  });
})();
