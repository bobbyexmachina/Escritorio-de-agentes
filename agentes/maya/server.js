/* ===========================================================
   Maya Albuquerque — Operações (Diretora de Operações IA)

   O sistema da agente: Mapa da Operação, diagnóstico, priorização,
   plano de ação, SOPs, rotinas, revisão planejado x realizado e o
   resumo executivo. Tudo fica em data/operacao.json, nesta pasta, e não
   sai da máquina. Nenhuma rota publica, envia ou altera outro sistema.

   O escritório sobe este arquivo com PORT=4412 (veja data/sistemas.json
   do escritório). Sozinho: node server.js  ->  http://localhost:4412
   =========================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const R = require('./regras');

const PORT = Number(process.env.PORT) || 4412;
const PASTA = __dirname;
const ARQ = path.join(PASTA, 'data', 'operacao.json');
const inicio = Date.now();
const hoje = () => new Date().toISOString().slice(0, 10);

const VAZIO = () => ({ empresa: {}, diagnostico: { objetivo: '', situacao: '', itens: [] }, acoes: [], sops: [], rotinas: [], decisoes: [] });

/* ---------------- dados ---------------- */
function ler() {
  try { return Object.assign(VAZIO(), JSON.parse(fs.readFileSync(ARQ, 'utf8'))); }
  catch (e) { return VAZIO(); }
}
function gravar(d) {
  fs.mkdirSync(path.dirname(ARQ), { recursive: true });
  if (fs.existsSync(ARQ)) fs.copyFileSync(ARQ, ARQ.replace(/\.json$/, '.bak.json'));
  fs.writeFileSync(ARQ + '.tmp', JSON.stringify(d, null, 2) + '\n');
  fs.renameSync(ARQ + '.tmp', ARQ);
}
const txt = (v, n = 600) => String(v == null ? '' : v).slice(0, n).trim();
const data = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
const nota = v => [1, 2, 3].includes(Number(v)) ? Number(v) : '';
const nat = v => R.NATUREZAS.includes(v) ? v : 'fato';

/* cada coleção aceita só os seus campos */
const LIMPA = {
  acoes: (b, a = {}) => {
    const x = Object.assign({}, a, {
      titulo: txt(b.titulo ?? a.titulo, 200) || 'Ação sem título', responsavel: txt(b.responsavel ?? a.responsavel, 120),
      prazo: data(b.prazo ?? a.prazo), criterio: txt(b.criterio ?? a.criterio), metrica: txt(b.metrica ?? a.metrica, 300),
      impacto: nota(b.impacto ?? a.impacto), urgencia: nota(b.urgencia ?? a.urgencia), esforco: nota(b.esforco ?? a.esforco),
      dependeDe: (Array.isArray(b.dependeDe) ? b.dependeDe : a.dependeDe || []).map(s => txt(s, 40)).filter(Boolean).slice(0, 10),
      status: R.STATUS.includes(b.status) ? b.status : (a.status || 'a fazer'), notas: txt(b.notas ?? a.notas, 2000)
    });
    if (x.status === 'feita' && !x.concluidaEm) x.concluidaEm = hoje();
    if (x.status !== 'feita') x.concluidaEm = '';
    return x;
  },
  sops: (b, a = {}) => Object.assign({}, a, {
    titulo: txt(b.titulo ?? a.titulo, 200) || 'SOP sem título', objetivo: txt(b.objetivo ?? a.objetivo),
    gatilho: txt(b.gatilho ?? a.gatilho, 300), responsavel: txt(b.responsavel ?? a.responsavel, 120),
    passos: (Array.isArray(b.passos) ? b.passos : a.passos || []).map(p => txt(p, 400)).filter(Boolean).slice(0, 60),
    pronto: txt(b.pronto ?? a.pronto), revisadoEm: data(b.revisadoEm ?? a.revisadoEm) || hoje()
  }),
  rotinas: (b, a = {}) => Object.assign({}, a, {
    cadencia: ['diaria', 'semanal', 'mensal'].includes(b.cadencia) ? b.cadencia : (a.cadencia || 'semanal'),
    titulo: txt(b.titulo ?? a.titulo, 200) || 'Rotina', quando: txt(b.quando ?? a.quando, 120),
    responsavel: txt(b.responsavel ?? a.responsavel, 120), duracao: txt(b.duracao ?? a.duracao, 60), pauta: txt(b.pauta ?? a.pauta, 2000)
  }),
  decisoes: (b, a = {}) => Object.assign({}, a, {
    data: data(b.data ?? a.data) || hoje(), texto: txt(b.texto ?? a.texto, 1000) || 'Decisão', natureza: nat(b.natureza ?? a.natureza)
  })
};
const CAMPOS_EMPRESA = R.PERGUNTAS.map(p => p[0]);

/* ---------------- HTTP ---------------- */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const json = (res, st, o) => { res.writeHead(st, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const md = (res, t) => { res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(t); };
function corpo(req) {
  return new Promise((ok, falha) => {
    let b = '';
    req.on('data', d => { b += d; if (b.length > 4e6) { falha(new Error('grande demais')); req.destroy(); } });
    req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { falha(e); } });
  });
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const rota = u.pathname, met = req.method;
  if (met !== 'GET' && req.headers.origin &&
      !new RegExp('^http://(localhost|127\\.0\\.0\\.1|\\[::1\\]):' + PORT + '$', 'i').test(req.headers.origin))
    return json(res, 403, { ok: false, motivo: 'origem não permitida' });

  try {
    const d = ler();
    if (rota === '/api/status') return json(res, 200, { ok: true, agente: 'Maya Albuquerque', area: 'Operações', noArDesde: new Date(inicio).toISOString() });
    if (rota === '/api/dados') return json(res, 200, d);
    if (rota === '/api/analise') return json(res, 200, R.analisar(d));
    if (rota === '/api/entrega') return md(res, R.entrega(d));
    if (rota === '/api/resumo') return md(res, R.resumoExecutivo(d));
    const ms = rota.match(/^\/api\/sop\/([\w-]+)$/);
    if (ms) { const s = d.sops.find(s => s.id === ms[1]); return s ? md(res, R.sopTexto(s)) : json(res, 404, { ok: false }); }

    if (rota === '/api/empresa' && met === 'PUT') {
      const b = await corpo(req); d.empresa = {};
      for (const k of CAMPOS_EMPRESA) d.empresa[k] = txt(b[k], 2000);
      gravar(d); return json(res, 200, { ok: true });
    }
    if (rota === '/api/diagnostico' && met === 'PUT') {
      const b = await corpo(req);
      d.diagnostico = { objetivo: txt(b.objetivo, 1000), situacao: txt(b.situacao, 3000),
        itens: (Array.isArray(b.itens) ? b.itens : []).slice(0, 200).map(i => ({ id: txt(i.id, 40) || crypto.randomUUID(),
          tipo: ['gargalo', 'dependencia', 'risco', 'situacao'].includes(i.tipo) ? i.tipo : 'situacao', texto: txt(i.texto, 600), natureza: nat(i.natureza) }))
          .filter(i => i.texto) };
      gravar(d); return json(res, 200, { ok: true });
    }

    const mc = rota.match(/^\/api\/(acoes|sops|rotinas|decisoes)(?:\/([\w-]+))?$/);
    if (mc) {
      const [, col, id] = mc;
      if (!id && met === 'POST') { const x = LIMPA[col](await corpo(req)); x.id = crypto.randomUUID(); d[col].push(x); gravar(d); return json(res, 200, { ok: true, item: x }); }
      const i = d[col].findIndex(x => x.id === id);
      if (id && i < 0) return json(res, 404, { ok: false, motivo: 'não encontrado' });
      if (id && met === 'PUT') { d[col][i] = LIMPA[col](await corpo(req), d[col][i]); gravar(d); return json(res, 200, { ok: true, item: d[col][i] }); }
      if (id && met === 'DELETE') {
        if (u.searchParams.get('confirmar') !== 'sim') return json(res, 400, { ok: false, motivo: 'confirmação necessária' });
        d[col].splice(i, 1);
        if (col === 'acoes') for (const a of d.acoes) a.dependeDe = (a.dependeDe || []).filter(x => x !== id);
        gravar(d); return json(res, 200, { ok: true });
      }
    }
    if (rota.startsWith('/api/')) return json(res, 404, { ok: false, motivo: 'rota não existe' });

    const rel = rota === '/' ? '/index.html' : rota;
    const arq = path.join(PASTA, 'public', path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!arq.startsWith(path.join(PASTA, 'public'))) return json(res, 403, { ok: false });
    fs.readFile(arq, (e, buf) => {
      if (e) { res.writeHead(404).end('404'); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(buf);
    });
  } catch (e) {
    json(res, 400, { ok: false, motivo: e.message });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Maya Albuquerque (Operações) -> http://localhost:${PORT}`));
