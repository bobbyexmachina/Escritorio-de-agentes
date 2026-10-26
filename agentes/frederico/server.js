/* ===========================================================
   Frederico — Comercial & CRM

   O sistema do agente: CRM no formato padrão, pipeline, follow-ups,
   qualificação com critérios explícitos, propostas e análise do funil.
   Os leads ficam em data/crm.json, nesta pasta, e não saem da máquina.
   Nenhuma rota envia mensagem, e-mail ou WhatsApp: tudo é texto para copiar.

   Integrações (só leitura e pesquisa, veja integracoes/):
   - HubSpot: pela estação HubSpot do escritório ou por Service Key;
   - Apollo.io: People API Search com a chave de API.
   As credenciais ficam só na memória deste processo.

   O escritório sobe este arquivo com PORT=4411 (veja data/sistemas.json
   do escritório). Sozinho: node server.js  ->  http://localhost:4411
   =========================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const R = require('./regras');
const { criarHubSpot, RECURSOS, ETAPA_HUBSPOT, ErroIntegracao } = require('./integracoes/hubspot');
const { criarApollo } = require('./integracoes/apollo');
const HS = criarHubSpot();
const AP = criarApollo();
/* o que a última listagem do HubSpot devolveu: importar usa isto, não o que o navegador mandar */
let vistosHS = new Map();

const PORT = Number(process.env.PORT) || 4411;
const PASTA = __dirname;
const ARQ = path.join(PASTA, 'data', 'crm.json');
const inicio = Date.now();
const hoje = () => new Date().toISOString().slice(0, 10);

/* ---------------- dados ---------------- */
function ler() {
  try { const d = JSON.parse(fs.readFileSync(ARQ, 'utf8')); return { empresa: d.empresa || {}, leads: d.leads || [] }; }
  catch (e) { return { empresa: {}, leads: [] }; }
}
function gravar(d) {
  fs.mkdirSync(path.dirname(ARQ), { recursive: true });
  if (fs.existsSync(ARQ)) fs.copyFileSync(ARQ, ARQ.replace(/\.json$/, '.bak.json'));
  fs.writeFileSync(ARQ + '.tmp', JSON.stringify(d, null, 2) + '\n');
  fs.renameSync(ARQ + '.tmp', ARQ);
}
const txt = (v, n = 600) => String(v == null ? '' : v).slice(0, n).trim();
const data = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';

const CAMPOS_EMPRESA = ['nomeEmpresa', 'produto', 'ticketMedio', 'publicoIdeal', 'origemLeads', 'cicloVenda', 'canalPrincipal',
  'volumeLeads', 'etapasFunil', 'objecoes', 'metaComercial', 'metaValor', 'moeda', 'condicoes', 'icpPerfis', 'icpSinais',
  'etapasPipeline', 'canais'];
function limpaEmpresa(b) {
  const e = {};
  for (const k of CAMPOS_EMPRESA) if (b && b[k] !== undefined) e[k] = txt(b[k], 3000);
  if (e.moeda) e.moeda = e.moeda.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return e;
}
/** só os campos do CRM: o que vier a mais é descartado */
function limpaLead(b, antigo, etapas) {
  const l = Object.assign({}, antigo || {});
  for (const k of ['nome', 'contato', 'origem', 'necessidade', 'proximoPasso', 'motivoContato', 'objecao', 'observacoes', 'motivoPerda'])
    if (b[k] !== undefined) l[k] = txt(b[k], k === 'observacoes' ? 3000 : 600);
  for (const k of ['ultimaInteracao', 'dataProximoPasso']) if (b[k] !== undefined) l[k] = data(b[k]);
  if (b.valorPotencial !== undefined) l.valorPotencial = b.valorPotencial === '' || b.valorPotencial === null ? '' : String(Number(b.valorPotencial) || '');
  if (b.qualificacao && typeof b.qualificacao === 'object') {
    l.qualificacao = {};
    for (const [k] of R.CRITERIOS) { const v = b.qualificacao[k]; l.qualificacao[k] = (v === 0 || v === 1 || v === 2 || v === '0' || v === '1' || v === '2') ? Number(v) : ''; }
  }
  if (!l.id) l.id = crypto.randomUUID();
  if (!l.criadoEm) l.criadoEm = hoje();
  if (!l.etapa || !etapas.includes(l.etapa)) l.etapa = etapas.includes(b.etapa) ? b.etapa : etapas[0];
  if (!Array.isArray(l.historico)) l.historico = [];
  if (!l.nome) l.nome = 'Sem nome';
  return l;
}

/* ---------------- leads vindos das integrações ---------------- */
function leadImportado(campos, externo, etapas, etapa) {
  const l = limpaLead(Object.assign({ proximoPasso: 'Revisar a origem e definir o próximo passo', dataProximoPasso: hoje(),
                                      motivoContato: 'Lead importado: validar fit antes de qualquer contato' }, campos), null, etapas);
  if (etapa && etapas.includes(etapa)) l.etapa = etapa;
  if (R.FECHADAS.includes(l.etapa)) {
    // negócio que já fechou no HubSpot não ganha follow-up
    l.proximoPasso = ''; l.dataProximoPasso = ''; l.motivoContato = '';
    l.dataFechamento = campos.dataFechamento || hoje();
  }
  l.externo = externo;
  l.historico.push({ data: hoje(), para: l.etapa });
  return l;
}
function leadDoHubSpot(x, etapas) {
  const p = x.props || {}, ref = { hubspot: { recurso: x.recurso, id: x.id, url: x.url || null } };
  const fonte = `Importado do HubSpot (${RECURSOS[x.recurso].nome.toLowerCase()} ${x.id}).`;
  if (x.recurso === 'contacts') {
    const pessoa = [p.firstname, p.lastname].filter(Boolean).join(' ');
    return leadImportado({ nome: p.company || pessoa || 'Contato HubSpot ' + x.id, origem: 'HubSpot',
      contato: [pessoa + (p.jobtitle ? ` (${p.jobtitle})` : ''), p.email].filter(Boolean).join(' · '), observacoes: fonte }, ref, etapas);
  }
  if (x.recurso === 'companies')
    return leadImportado({ nome: p.name || p.domain || 'Empresa HubSpot ' + x.id, origem: 'HubSpot',
      observacoes: [fonte, p.domain && `Domínio: ${p.domain}.`, p.industry && `Setor: ${p.industry}.`, p.city && `Cidade: ${p.city}.`].filter(Boolean).join(' ') }, ref, etapas);
  // negócio: valor e etapa vêm do HubSpot; etapa fora do pipeline padrão entra como a primeira
  return leadImportado({ nome: p.dealname || 'Negócio HubSpot ' + x.id, origem: 'HubSpot',
    valorPotencial: p.amount === '' || p.amount === null || p.amount === undefined ? '' : Number(p.amount),
    dataFechamento: p.closedate ? String(p.closedate).slice(0, 10) : '',
    observacoes: [fonte, p.dealstage && `Etapa no HubSpot: ${p.dealstage}.`, p.closedate && `Fechamento no HubSpot: ${String(p.closedate).slice(0, 10)}.`].filter(Boolean).join(' ') },
    ref, etapas, ETAPA_HUBSPOT[p.dealstage]);
}
function leadDoApollo(x, etapas) {
  return leadImportado({ nome: x.empresa || x.nome, origem: 'Apollo.io',
    contato: x.nome + (x.cargo ? ` (${x.cargo})` : ''),
    proximoPasso: 'Validar fit e definir um canal de contato autorizado',
    observacoes: ['Pesquisa no Apollo.io.', x.cargo && `Cargo: ${x.cargo}.`, x.local && `Local: ${x.local}.`, x.dominio && `Domínio: ${x.dominio}.`,
      x.temEmail ? 'O Apollo indica e-mail disponível, mas ele não foi obtido (exigiria enriquecimento com crédito).' : '',
      'Nome pode estar parcial. Nenhum contato foi feito.'].filter(Boolean).join(' ') },
    { apollo: { id: x.apolloId } }, etapas);
}

/* ---------------- CSV no formato do CRM padrão ---------------- */
function linhasCSV(t) {
  const prim = t.split('\n')[0] || '';
  const sep = (prim.match(/;/g) || []).length >= (prim.match(/,/g) || []).length ? ';' : ',';
  return t.replace(/\r/g, '').split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).map(l => {
    const out = []; let cur = '', q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out.map(c => c.trim());
  });
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
const dataBR = v => { const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : data(v); };
const valorBR = v => { v = String(v || '').replace(/[^\d,.-]/g, ''); if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.'); else v = v.replace(/,/g, ''); return v === '' ? '' : Number(v); };
function lerCSV(t, etapas) {
  const linhas = linhasCSV(String(t || ''));
  if (!linhas.length) return { leads: [], erros: ['arquivo vazio'] };
  const cab = linhas[0].map(norm);
  const pos = {};
  for (const [k, rot] of R.COLUNAS) pos[k] = cab.findIndex(c => c === norm(rot) || c === norm(k));
  if (pos.nome < 0) return { leads: [], erros: ['a primeira linha precisa ter os títulos das colunas, com "Nome/Empresa"'] };
  const leads = [], erros = [];
  linhas.slice(1).forEach((l, i) => {
    const v = k => pos[k] >= 0 ? l[pos[k]] : undefined;
    if (!v('nome')) { erros.push(`linha ${i + 2}: sem Nome/Empresa`); return; }
    const etapa = etapas.find(e => norm(e) === norm(v('etapa'))) || etapas[0];
    leads.push(limpaLead({ nome: v('nome'), contato: v('contato'), origem: v('origem'), necessidade: v('necessidade'), etapa,
      ultimaInteracao: dataBR(v('ultimaInteracao')), proximoPasso: v('proximoPasso'), dataProximoPasso: dataBR(v('dataProximoPasso')),
      valorPotencial: valorBR(v('valorPotencial')), objecao: v('objecao'), observacoes: v('observacoes') }, null, etapas));
  });
  return { leads, erros };
}
const campo = v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
function exportar(d) {
  return [R.COLUNAS.map(c => c[1]).join(';'), ...d.leads.map(l => R.COLUNAS.map(([k]) =>
    campo(k === 'fit' ? R.fit(l).texto : (l[k] == null ? '' : l[k]))).join(';'))].join('\n') + '\n';
}

/* ---------------- HTTP ---------------- */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const json = (res, st, o) => { res.writeHead(st, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const textoRes = (res, t, tipo) => { res.writeHead(200, { 'Content-Type': tipo || 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(t); };
function corpo(req) {
  return new Promise((ok, falha) => {
    let b = '';
    req.on('data', d => { b += d; if (b.length > 8e6) { falha(new Error('grande demais')); req.destroy(); } });
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
    const etapas = R.etapasDe(d.empresa);
    const mLead = rota.match(/^\/api\/leads\/([\w-]+)(\/etapa)?$/);

    if (rota === '/api/status') return json(res, 200, { ok: true, agente: 'Frederico', area: 'Comercial & CRM', leads: d.leads.length, noArDesde: new Date(inicio).toISOString() });
    if (rota === '/api/dados') return json(res, 200, d);
    if (rota === '/api/analise') return json(res, 200, R.analisar(d));
    if (rota === '/api/resumo') return textoRes(res, R.resumo(d));
    if (rota === '/api/meta') return json(res, 200, { criterios: R.CRITERIOS, colunas: R.COLUNAS, perguntas: R.PERGUNTAS, etapas });

    if (rota === '/api/empresa' && met === 'PUT') { d.empresa = limpaEmpresa(await corpo(req)); gravar(d); return json(res, 200, { ok: true }); }

    if (rota === '/api/leads' && met === 'POST') {
      const l = limpaLead(await corpo(req), null, etapas);
      l.historico.push({ data: hoje(), para: l.etapa });
      d.leads.push(l); gravar(d); return json(res, 200, { ok: true, lead: l });
    }
    if (mLead) {
      const i = d.leads.findIndex(l => l.id === mLead[1]);
      if (i < 0) return json(res, 404, { ok: false, motivo: 'lead não encontrado' });
      if (mLead[2] && met === 'POST') {
        // mudar de etapa fica registrado: é daí que saem conversão e tempo parado
        const b = await corpo(req);
        if (!etapas.includes(b.para)) return json(res, 400, { ok: false, motivo: 'etapa desconhecida' });
        if (b.para === 'Perdido' && !txt(b.motivoPerda)) return json(res, 400, { ok: false, motivo: 'informe o motivo da perda' });
        const l = d.leads[i];
        l.historico.push({ data: hoje(), de: l.etapa, para: b.para });
        l.etapa = b.para; l.ultimaInteracao = hoje();
        if (b.para === 'Perdido') l.motivoPerda = txt(b.motivoPerda);
        if (b.para === 'Ganho' || b.para === 'Perdido') { l.dataFechamento = hoje(); }
        gravar(d); return json(res, 200, { ok: true, lead: l });
      }
      if (met === 'GET') return json(res, 200, { lead: d.leads[i], analise: R.analisarLead(d.leads[i], d.empresa), texto: R.leadTexto(d.leads[i], d.empresa) });
      if (met === 'PUT') { d.leads[i] = limpaLead(await corpo(req), d.leads[i], etapas); gravar(d); return json(res, 200, { ok: true, lead: d.leads[i] }); }
      if (met === 'DELETE') {
        if (u.searchParams.get('confirmar') !== 'sim') return json(res, 400, { ok: false, motivo: 'confirmação necessária' });
        d.leads.splice(i, 1); gravar(d); return json(res, 200, { ok: true });
      }
    }
    const mProp = rota.match(/^\/api\/proposta\/([\w-]+)$/);
    if (mProp && met === 'POST') {
      const l = d.leads.find(l => l.id === mProp[1]);
      if (!l) return json(res, 404, { ok: false, motivo: 'lead não encontrado' });
      return json(res, 200, R.proposta(l, d.empresa, await corpo(req)));
    }
    /* ---------- integrações ---------- */
    if (rota === '/api/integracoes') return json(res, 200, { hubspot: await HS.status(), apollo: AP.status() });
    if (rota === '/api/hubspot/conectar' && met === 'POST') return json(res, 200, await HS.conectar(await corpo(req)));
    if (rota === '/api/hubspot/desconectar' && met === 'POST') return json(res, 200, HS.desconectar());
    if (rota === '/api/hubspot/registros') {
      const r = await HS.listar(u.searchParams.get('recurso'), u.searchParams.get('depois'));
      const ja = new Set(d.leads.filter(l => l.externo && l.externo.hubspot).map(l => l.externo.hubspot.recurso + ':' + l.externo.hubspot.id));
      vistosHS = new Map(r.linhas.map(x => [r.recurso + ':' + x.id, Object.assign({ recurso: r.recurso, vale: Date.now() + 30 * 60e3 }, x)]));
      for (const x of r.linhas) x.noCRM = ja.has(r.recurso + ':' + x.id);
      return json(res, 200, r);
    }
    if (rota === '/api/hubspot/importar' && met === 'POST') {
      const b = await corpo(req);
      const x = vistosHS.get(b.recurso + ':' + b.id);
      if (!x || x.vale < Date.now()) return json(res, 409, { ok: false, motivo: 'esse registro expirou: liste de novo antes de importar' });
      if (d.leads.some(l => l.externo && l.externo.hubspot && l.externo.hubspot.recurso === x.recurso && l.externo.hubspot.id === x.id))
        return json(res, 409, { ok: false, motivo: 'esse registro do HubSpot já está no CRM' });
      const l = leadDoHubSpot(x, etapas);
      d.leads.push(l); gravar(d); return json(res, 200, { ok: true, lead: l });
    }
    if (rota === '/api/apollo/conectar' && met === 'POST') return json(res, 200, await AP.conectar((await corpo(req)).chave));
    if (rota === '/api/apollo/desconectar' && met === 'POST') return json(res, 200, AP.desconectar());
    if (rota === '/api/apollo/pesquisa' && met === 'POST') {
      const r = await AP.pesquisar(await corpo(req));
      const ja = new Set(d.leads.filter(l => l.externo && l.externo.apollo).map(l => l.externo.apollo.id));
      for (const x of r.linhas) x.noCRM = !!x.apolloId && ja.has(x.apolloId);
      return json(res, 200, r);
    }
    if (rota === '/api/apollo/importar' && met === 'POST') {
      const x = AP.resultado((await corpo(req)).id);
      if (x.apolloId && d.leads.some(l => l.externo && l.externo.apollo && l.externo.apollo.id === x.apolloId))
        return json(res, 409, { ok: false, motivo: 'essa pessoa do Apollo já está no CRM' });
      const l = leadDoApollo(x, etapas);
      d.leads.push(l); gravar(d); return json(res, 200, { ok: true, lead: l });
    }

    if (rota === '/api/importar' && met === 'POST') {
      // importar em massa pede duas chamadas: a primeira só mostra o que vai entrar
      const b = await corpo(req);
      const { leads, erros } = lerCSV(b.csv, etapas);
      if (b.confirmar !== true) return json(res, 200, { ok: true, previa: leads.slice(0, 5).map(l => l.nome), total: leads.length, erros });
      for (const l of leads) l.historico.push({ data: hoje(), para: l.etapa });
      d.leads.push(...leads); gravar(d);
      return json(res, 200, { ok: true, importados: leads.length, erros });
    }
    if (rota === '/api/crm.csv') {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="crm.csv"' });
      return res.end('﻿' + exportar(d));
    }
    if (rota === '/api/modelo.csv') {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="modelo-crm.csv"' });
      return res.end('﻿' + R.COLUNAS.map(c => c[1]).join(';') + '\n# Etapa: ' + etapas.join(' | ') + '   ·   datas: AAAA-MM-DD ou DD/MM/AAAA\n');
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
    json(res, e instanceof ErroIntegracao ? e.status : 400, { ok: false, motivo: e.message });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Frederico (Comercial & CRM) -> http://localhost:${PORT}`));
