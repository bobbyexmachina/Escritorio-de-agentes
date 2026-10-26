/* ===========================================================
   Rosângela Maria — Financeiro & Performance

   O sistema da agente: um painel local com caixa, resultado, margem,
   unit economics, orçamento, alertas, cenários e o relatório no formato
   padrão. Os números ficam em data/financeiro.json, nesta pasta, e não
   saem da máquina. Nenhuma rota movimenta dinheiro nem fala com banco.

   O escritório sobe este arquivo com PORT=4410 (veja data/sistemas.json
   do escritório). Sozinho: node server.js  ->  http://localhost:4410
   =========================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { analisar, relatorio, CLASSES } = require('./calc');

const PORT = Number(process.env.PORT) || 4410;
const PASTA = __dirname;
const ARQ = path.join(PASTA, 'data', 'financeiro.json');
const inicio = Date.now();

const VAZIO = { empresa: {}, lancamentos: [], orcamento: [], operacao: [], cenarios: null };

/* ---------------- dados ---------------- */
function ler() {
  try { return Object.assign({}, VAZIO, JSON.parse(fs.readFileSync(ARQ, 'utf8'))); }
  catch (e) { return JSON.parse(JSON.stringify(VAZIO)); }
}
/** grava num arquivo temporário e troca: um desligamento no meio nunca deixa o JSON pela metade */
function gravar(d) {
  fs.mkdirSync(path.dirname(ARQ), { recursive: true });
  if (fs.existsSync(ARQ)) fs.copyFileSync(ARQ, ARQ.replace(/\.json$/, '.bak.json'));
  const tmp = ARQ + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2) + '\n');
  fs.renameSync(tmp, ARQ);
}
/** aceita só o formato esperado: o que vier a mais é descartado */
function limpa(b) {
  const txt = (v, n = 400) => String(v == null ? '' : v).slice(0, n);
  const lista = v => Array.isArray(v) ? v.slice(0, 20000) : [];
  const emp = b.empresa && typeof b.empresa === 'object' ? b.empresa : {};
  const empresa = {};
  for (const k of ['nome', 'nicho', 'modeloReceita', 'produtos', 'moeda', 'periodoInicio', 'periodoFim', 'fontesReceita',
                   'custosFixos', 'custosVariaveis', 'registroAtual', 'metas', 'indicadores', 'saldoInicial',
                   'metaReceita', 'metaMargem', 'caixaMinimo']) if (emp[k] !== undefined) empresa[k] = txt(emp[k], 2000);
  if (empresa.moeda) empresa.moeda = empresa.moeda.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return {
    empresa,
    lancamentos: lista(b.lancamentos).map(l => ({
      id: txt(l.id, 40) || crypto.randomUUID(), data: txt(l.data, 10), descricao: txt(l.descricao, 200),
      classe: CLASSES[l.classe] ? l.classe : 'outra_saida', categoria: txt(l.categoria, 80),
      valor: Number(l.valor), cliente: txt(l.cliente, 120), status: l.status === 'previsto' ? 'previsto' : 'realizado'
    })),
    orcamento: lista(b.orcamento).map(o => ({ id: txt(o.id, 40) || crypto.randomUUID(), mes: txt(o.mes, 7),
      classe: CLASSES[o.classe] ? o.classe : 'custo_fixo', categoria: txt(o.categoria, 80), valor: Number(o.valor) })),
    operacao: lista(b.operacao).map(o => ({ mes: txt(o.mes, 7), vendas: txt(o.vendas, 20), clientesNovos: txt(o.clientesNovos, 20),
      investimentoAquisicao: txt(o.investimentoAquisicao, 30) })),
    cenarios: b.cenarios && typeof b.cenarios === 'object' ? {
      meses: Number(b.cenarios.meses) || 6,
      conservador: { receita: Number((b.cenarios.conservador || {}).receita) || 0, custos: Number((b.cenarios.conservador || {}).custos) || 0 },
      base:        { receita: Number((b.cenarios.base || {}).receita) || 0,        custos: Number((b.cenarios.base || {}).custos) || 0 },
      agressivo:   { receita: Number((b.cenarios.agressivo || {}).receita) || 0,   custos: Number((b.cenarios.agressivo || {}).custos) || 0 }
    } : null
  };
}

/* ---------------- CSV ----------------
   Colunas: data;descricao;classe;categoria;valor;cliente;status
   Aceita ; ou , como separador e valor em 1.234,56 ou 1234.56.        */
const COLUNAS = ['data', 'descricao', 'classe', 'categoria', 'valor', 'cliente', 'status'];
function linhasCSV(txt) {
  const sep = (txt.split('\n')[0].match(/;/g) || []).length >= (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  return txt.replace(/\r/g, '').split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).map(l => {
    const out = []; let cur = '', q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(c => c.trim());
  });
}
const valorBR = v => {
  v = String(v || '').replace(/[^\d,.-]/g, '');
  if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.');
  else v = v.replace(/,/g, '');
  return Number(v);
};
const dataBR = v => {
  const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(v || '');
};
const APELIDOS = { 'custo variável': 'custo_variavel', 'custo variavel': 'custo_variavel', 'custo fixo': 'custo_fixo',
                   'despesa': 'despesa', 'receita': 'receita', 'imposto': 'imposto', 'investimento': 'investimento',
                   'outra entrada': 'outra_entrada', 'outra saída': 'outra_saida', 'outra saida': 'outra_saida' };
function importar(txt) {
  const linhas = linhasCSV(String(txt || ''));
  if (!linhas.length) return { novos: [], erros: ['arquivo vazio'] };
  const cab = linhas[0].map(c => c.toLowerCase());
  const temCab = cab.includes('data') && cab.includes('valor');
  const idx = temCab ? COLUNAS.map(c => cab.indexOf(c)) : COLUNAS.map((c, i) => i);
  const novos = [], erros = [];
  linhas.slice(temCab ? 1 : 0).forEach((l, i) => {
    const pega = k => { const j = idx[COLUNAS.indexOf(k)]; return j >= 0 ? l[j] : ''; };
    let classe = String(pega('classe') || '').toLowerCase().trim();
    classe = CLASSES[classe] ? classe : (APELIDOS[classe] || '');
    const reg = { id: crypto.randomUUID(), data: dataBR(pega('data')), descricao: pega('descricao'), classe,
                  categoria: pega('categoria'), valor: valorBR(pega('valor')), cliente: pega('cliente'),
                  status: String(pega('status')).toLowerCase().startsWith('prev') ? 'previsto' : 'realizado' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reg.data) || !(reg.valor > 0) || !reg.classe)
      erros.push(`linha ${i + (temCab ? 2 : 1)}: ${!/^\d{4}-\d{2}-\d{2}$/.test(reg.data) ? 'data inválida' : !(reg.valor > 0) ? 'valor inválido' : 'classe desconhecida'}`);
    else novos.push(reg);
  });
  return { novos, erros };
}
const csvCampo = v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
function exportar(lancs) {
  return [COLUNAS.join(';'), ...lancs.map(l => COLUNAS.map(c =>
    csvCampo(c === 'valor' ? String(l.valor).replace('.', ',') : (l[c] == null ? '' : l[c]))).join(';'))].join('\n') + '\n';
}

/* ---------------- HTTP ---------------- */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const json = (res, st, o) => { res.writeHead(st, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
function corpo(req) {
  return new Promise((ok, falha) => {
    let b = '';
    req.on('data', d => { b += d; if (b.length > 8e6) { falha(new Error('grande demais')); req.destroy(); } });
    req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { falha(e); } });
  });
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const rota = u.pathname;
  // escrita só a partir da própria página: outro site aberto no navegador não mexe nos números
  if (req.method !== 'GET' && req.headers.origin &&
      !new RegExp('^http://(localhost|127\\.0\\.0\\.1|\\[::1\\]):' + PORT + '$', 'i').test(req.headers.origin))
    return json(res, 403, { ok: false, motivo: 'origem não permitida' });

  try {
    if (rota === '/api/status') return json(res, 200, { ok: true, agente: 'Rosângela Maria', area: 'Financeiro & Performance', noArDesde: new Date(inicio).toISOString() });
    if (rota === '/api/dados' && req.method === 'GET') return json(res, 200, ler());
    if (rota === '/api/dados' && req.method === 'PUT') { const d = limpa(await corpo(req)); gravar(d); return json(res, 200, { ok: true }); }
    if (rota === '/api/analise') return json(res, 200, analisar(ler(), u.searchParams.get('mes') || undefined));
    if (rota === '/api/relatorio') {
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(relatorio(ler(), u.searchParams.get('mes') || undefined));
    }
    if (rota === '/api/importar' && req.method === 'POST') {
      const { novos, erros } = importar((await corpo(req)).csv);
      if (novos.length) { const d = ler(); d.lancamentos.push(...novos); gravar(limpa(d)); }
      return json(res, 200, { ok: true, importados: novos.length, erros });
    }
    if (rota === '/api/lancamentos.csv') {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="lancamentos.csv"' });
      return res.end('﻿' + exportar(ler().lancamentos));
    }
    if (rota === '/api/modelo.csv') {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="modelo-lancamentos.csv"' });
      return res.end('﻿' + COLUNAS.join(';') + '\n' +
        '# classe: receita | imposto | custo_variavel | custo_fixo | despesa | investimento | outra_entrada | outra_saida\n' +
        '# status: realizado | previsto   ·   data: AAAA-MM-DD ou DD/MM/AAAA   ·   valor sempre positivo\n');
    }
    if (rota.startsWith('/api/')) return json(res, 404, { ok: false, motivo: 'rota não existe' });

    // estáticos de public/
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
}).listen(PORT, '127.0.0.1', () => console.log(`Rosângela Maria (Financeiro & Performance) -> http://localhost:${PORT}`));
