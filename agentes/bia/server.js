/* ===========================================================
   Bia — Atendimento & Sucesso

   O sistema da agente: triagem de mensagens, fila de casos no formato
   padrão, escalonamento, base de conhecimento (só resposta confirmada
   vale), roteiros de sucesso do cliente e feedback por tema. Tudo fica
   em data/atendimento.json, nesta pasta, e não sai da máquina. Nenhuma
   rota envia mensagem, reembolsa, cancela ou altera pedido.

   O escritório sobe este arquivo com PORT=4414 (veja data/sistemas.json
   do escritório). Sozinho: node server.js  ->  http://localhost:4414
   =========================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const R = require('./regras');

const PORT = Number(process.env.PORT) || 4414;
const PASTA = __dirname;
const ARQ = path.join(PASTA, 'data', 'atendimento.json');
const inicio = Date.now();
const hoje = () => new Date().toISOString().slice(0, 10);

const VAZIO = () => ({ empresa: {}, casos: [], faq: [], sucesso: [] });

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
const txt = (v, n = 1000) => String(v == null ? '' : v).slice(0, n).trim();
const data = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
const um = (v, lista, padrao) => lista.includes(v) ? v : padrao;
/* número de cartão colado na mensagem nunca é gravado inteiro */
const mascara = t => String(t || '').replace(/\b(\d[ -]?){9,15}(\d{4})\b/g, '•••• $2');
const campos = (b, a, defs) => {
  const x = Object.assign({}, a);
  for (const [k, n] of defs) if (b[k] !== undefined) x[k] = txt(b[k], n);
  return x;
};
const CATS = R.CATEGORIAS.map(c => c[0]);
const LIMPA = {
  casos: (b, a = {}) => {
    const x = Object.assign(campos(b, a, [['cliente', 120], ['canal', 60], ['mensagem', 6000], ['resumo', 600], ['pedidoReal', 600],
        ['historico', 2000], ['faltam', 600], ['resposta', 4000], ['acao', 600], ['motivo', 600], ['tema', 120]]), {
      data: data(b.data ?? a.data) || hoje(), categoria: um(b.categoria ?? a.categoria, CATS, 'duvida'),
      prioridade: um(b.prioridade ?? a.prioridade, R.PRIORIDADES, 'média'),
      sentimento: um(b.sentimento ?? a.sentimento, ['positivo', 'neutro', 'negativo'], 'neutro'),
      urgencia: um(b.urgencia ?? a.urgencia, ['normal', 'alta'], 'normal'),
      precisaHumano: b.precisaHumano !== undefined ? !!b.precisaHumano : !!a.precisaHumano,
      status: um(b.status ?? a.status, R.STATUS, 'aberto'),
      riscos: Array.isArray(b.riscos) ? b.riscos.map(r => txt(r, 60)).slice(0, 10) : (a.riscos || [])
    });
    x.mensagem = mascara(x.mensagem); x.historico = mascara(x.historico);
    if (x.status === 'resolvido' && !x.resolvidoEm) x.resolvidoEm = hoje();
    return x;
  },
  faq: (b, a = {}) => Object.assign(campos(b, a, [['pergunta', 400], ['resposta', 3000], ['palavras', 300], ['fonte', 300], ['tema', 120]]), {
    confirmada: b.confirmada !== undefined ? !!b.confirmada : !!a.confirmada
  }),
  sucesso: (b, a = {}) => Object.assign(campos(b, a, [['produto', 200], ['quando', 120], ['acao', 600], ['mensagem', 2000]]), {
    etapa: um(b.etapa ?? a.etapa, ['onboarding', 'acompanhamento', 'prevencao'], 'onboarding')
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
    if (rota === '/api/status') return json(res, 200, { ok: true, agente: 'Bia', area: 'Atendimento & Sucesso', noArDesde: new Date(inicio).toISOString() });
    if (rota === '/api/dados') return json(res, 200, d);
    if (rota === '/api/analise') return json(res, 200, R.analisar(d));
    if (rota === '/api/resumo') return md(res, R.resumo(d));
    // a triagem lê o texto como veio (para avisar de cartão colado), mas nada dele é gravado aqui
    if (rota === '/api/triagem' && met === 'POST') return json(res, 200, R.triar(String((await corpo(req)).mensagem || '').slice(0, 6000), d.faq));
    if (rota === '/api/conferir' && met === 'POST') return json(res, 200, { alertas: R.conferir((await corpo(req)).texto) });
    const mt = rota.match(/^\/api\/texto\/casos\/([\w-]+)$/);
    if (mt) { const c = d.casos.find(c => c.id === mt[1]); return c ? md(res, R.casoTexto(c)) : json(res, 404, { ok: false }); }
    if (rota === '/api/empresa' && met === 'PUT') {
      const b = await corpo(req); d.empresa = {};
      for (const k of CAMPOS_EMPRESA) d.empresa[k] = txt(b[k], 4000);
      gravar(d); return json(res, 200, { ok: true });
    }
    const mc = rota.match(/^\/api\/(casos|faq|sucesso)(?:\/([\w-]+))?$/);
    if (mc) {
      const [, col, id] = mc;
      if (!id && met === 'POST') { const x = LIMPA[col](await corpo(req)); x.id = crypto.randomUUID(); d[col].push(x); gravar(d); return json(res, 200, { ok: true, item: x }); }
      const i = d[col].findIndex(x => x.id === id);
      if (id && i < 0) return json(res, 404, { ok: false, motivo: 'não encontrado' });
      if (id && met === 'PUT') { d[col][i] = LIMPA[col](await corpo(req), d[col][i]); gravar(d); return json(res, 200, { ok: true, item: d[col][i] }); }
      if (id && met === 'DELETE') {
        if (u.searchParams.get('confirmar') !== 'sim') return json(res, 400, { ok: false, motivo: 'confirmação necessária' });
        d[col].splice(i, 1); gravar(d); return json(res, 200, { ok: true });
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
}).listen(PORT, '127.0.0.1', () => console.log(`Bia (Atendimento & Sucesso) -> http://localhost:${PORT}`));
