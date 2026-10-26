/* ===========================================================
   Duda — Marketing & Conteúdo

   O sistema da agente: Mapa de Comunicação, posicionamento, pilares,
   funil, criativos por ângulo, biblioteca de copy, calendário de
   conteúdo, testes e aprendizados. Tudo fica em data/marketing.json,
   nesta pasta, e não sai da máquina. Nenhuma rota publica conteúdo nem
   mexe em campanha: tudo é texto pronto para copiar.

   O escritório sobe este arquivo com PORT=4413 (veja data/sistemas.json
   do escritório). Sozinho: node server.js  ->  http://localhost:4413
   =========================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const R = require('./regras');

const PORT = Number(process.env.PORT) || 4413;
const PASTA = __dirname;
const ARQ = path.join(PASTA, 'data', 'marketing.json');
const inicio = Date.now();
const hoje = () => new Date().toISOString().slice(0, 10);

const VAZIO = () => ({ empresa: {}, posicionamento: {}, pilares: [], criativos: [], copys: [], conteudos: [], testes: [], aprendizados: [] });

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
const ANG = R.ANGULOS.map(a => a[0]), ETP = R.ETAPAS.map(e => e[0]);

/* cada coleção aceita só os seus campos; o que vier a mais é descartado */
const campos = (b, a, defs) => {
  const x = Object.assign({}, a);
  for (const [k, n] of defs) if (b[k] !== undefined) x[k] = txt(b[k], n);
  return x;
};
const LIMPA = {
  pilares: (b, a = {}) => campos(b, a, [['nome', 120], ['descricao', 600], ['objetivo', 300]]),
  criativos: (b, a = {}) => Object.assign(campos(b, a, [['titulo', 160], ['hook', 300], ['prova', 600], ['beneficio', 400], ['objecao', 400],
      ['cta', 200], ['ideia', 300], ['textoImagem', 300], ['hierarquia', 300], ['legenda', 2200]]), {
    angulo: um(b.angulo ?? a.angulo, ANG, 'dor'), formato: um(b.formato ?? a.formato, ['video', 'imagem'], 'video'),
    etapa: um(b.etapa ?? a.etapa, ETP, 'descoberta'), status: um(b.status ?? a.status, ['rascunho', 'aprovado', 'no ar', 'pausado'], 'rascunho')
  }),
  copys: (b, a = {}) => Object.assign(campos(b, a, [['texto', 6000], ['contexto', 300]]), {
    tipo: um(b.tipo ?? a.tipo, ['hook', 'headline', 'corpo', 'cta', 'legenda', 'pagina', 'email'], 'hook'),
    status: um(b.status ?? a.status, ['rascunho', 'aprovado'], 'rascunho')
  }),
  conteudos: (b, a = {}) => Object.assign(campos(b, a, [['canal', 80], ['formato', 80], ['objetivo', 300], ['publico', 300], ['pilar', 40],
      ['assunto', 300], ['gancho', 300], ['roteiro', 6000], ['cta', 200], ['visual', 600]]), {
    data: data(b.data ?? a.data), etapa: um(b.etapa ?? a.etapa, ETP, 'descoberta'),
    status: um(b.status ?? a.status, ['ideia', 'produção', 'aprovado', 'publicado'], 'ideia')
  }),
  testes: (b, a = {}) => Object.assign(campos(b, a, [['hipotese', 600], ['variavel', 200], ['criativo', 300], ['metrica', 200],
      ['resultado', 600], ['decisao', 600]]), {
    status: um(b.status ?? a.status, ['planejado', 'rodando', 'concluido'], 'planejado'),
    inicio: data(b.inicio ?? a.inicio), fim: data(b.fim ?? a.fim)
  }),
  aprendizados: (b, a = {}) => Object.assign(campos(b, a, [['texto', 1000], ['origem', 200]]), {
    data: data(b.data ?? a.data) || hoje(), natureza: um(b.natureza ?? a.natureza, Object.keys(R.NATUREZAS), 'observacao')
  })
};
const CAMPOS_EMPRESA = R.PERGUNTAS.map(p => p[0]);
const CAMPOS_POS = ['propostaValor', 'publico', 'problema', 'mecanismo', 'diferenciais'];

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
    const nomeAng = k => (R.ANGULOS.find(x => x[0] === k) || [k, k])[1];
    const nomePil = id => (d.pilares.find(p => p.id === id) || {}).nome || id;
    if (rota === '/api/status') return json(res, 200, { ok: true, agente: 'Duda', area: 'Marketing & Conteúdo', noArDesde: new Date(inicio).toISOString() });
    if (rota === '/api/dados') return json(res, 200, d);
    if (rota === '/api/analise') return json(res, 200, R.analisar(d));
    if (rota === '/api/mapa') return md(res, R.mapa(d));
    const mt = rota.match(/^\/api\/texto\/(criativos|conteudos)\/([\w-]+)$/);
    if (mt) {
      const x = d[mt[1]].find(x => x.id === mt[2]);
      if (!x) return json(res, 404, { ok: false });
      return md(res, mt[1] === 'criativos' ? R.criativoTexto(x, nomeAng) : R.conteudoTexto(x, nomePil));
    }
    if (rota === '/api/empresa' && met === 'PUT') {
      const b = await corpo(req); d.empresa = {};
      for (const k of CAMPOS_EMPRESA) d.empresa[k] = txt(b[k], 3000);
      gravar(d); return json(res, 200, { ok: true });
    }
    if (rota === '/api/posicionamento' && met === 'PUT') {
      const b = await corpo(req); d.posicionamento = {};
      for (const k of CAMPOS_POS) d.posicionamento[k] = txt(b[k], 2000);
      gravar(d); return json(res, 200, { ok: true });
    }
    const mc = rota.match(/^\/api\/(pilares|criativos|copys|conteudos|testes|aprendizados)(?:\/([\w-]+))?$/);
    if (mc) {
      const [, col, id] = mc;
      if (!id && met === 'POST') {
        if (col === 'pilares' && d.pilares.length >= 6) return json(res, 400, { ok: false, motivo: 'no máximo 6 pilares: junte ou troque um' });
        const x = LIMPA[col](await corpo(req)); x.id = crypto.randomUUID(); x.criadoEm = hoje();
        d[col].push(x); gravar(d); return json(res, 200, { ok: true, item: x });
      }
      const i = d[col].findIndex(x => x.id === id);
      if (id && i < 0) return json(res, 404, { ok: false, motivo: 'não encontrado' });
      if (id && met === 'PUT') { d[col][i] = LIMPA[col](await corpo(req), d[col][i]); gravar(d); return json(res, 200, { ok: true, item: d[col][i] }); }
      if (id && met === 'DELETE') {
        if (u.searchParams.get('confirmar') !== 'sim') return json(res, 400, { ok: false, motivo: 'confirmação necessária' });
        d[col].splice(i, 1);
        if (col === 'pilares') for (const c of d.conteudos) if (c.pilar === id) c.pilar = '';
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
}).listen(PORT, '127.0.0.1', () => console.log(`Duda (Marketing & Conteúdo) -> http://localhost:${PORT}`));
