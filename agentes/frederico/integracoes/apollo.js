/* ===========================================================
   integracoes/apollo.js — o Frederico pesquisando no Apollo.io

   - A chave de API é digitada no painel do Frederico (ou APOLLO_API_KEY
     no ambiente) e fica só na memória do processo: não vai para
     data/crm.json, log, exportação ou resposta da API.
   - A conexão só vale depois de auth/health confirmar healthy e
     is_logged_in.
   - Usa só a People API Search: até 10 pessoas por consulta, sem e-mail
     nem telefone, sem enriquecimento, sem sequência, sem disparo.
   Doc: https://docs.apollo.io/reference/people-api-search
   =========================================================== */
'use strict';
const crypto = require('crypto');
const { ErroIntegracao } = require('./hubspot');

const BASE = 'https://api.apollo.io/api/v1/';

function lista(v, max = 8) {
  if (v === undefined || v === null || v === '') return [];
  if (typeof v !== 'string' || v.length > 1200) throw new ErroIntegracao('Filtro inválido.');
  const itens = v.split(',').map(s => s.trim()).filter(Boolean);
  if (itens.length > max || itens.some(s => s.length > 160)) throw new ErroIntegracao('Filtros demais ou muito longos.');
  return itens;
}

/* faixas de funcionários aceitas pelo Apollo ("1,10", "11,50"…) */
const FAIXAS = ['1,10', '11,20', '21,50', '51,100', '101,200', '201,500', '501,1000', '1001,2000', '2001,5000', '5001,10000', '10001,'];

function criarApollo({ chaveInicial = process.env.APOLLO_API_KEY || '', pedir = fetch } = {}) {
  let chave = String(chaveInicial).trim(), conectado = false, verificadoEm = null, ocupado = false;
  let cache = new Map();

  const status = () => ({ conectado, configurado: !!chave, verificadoEm,
    modo: 'Pesquisa de pessoas (People API Search) — sem enriquecimento, sem e-mail/telefone, sem disparos' });

  async function chamar(rota, corpo, candidata = chave) {
    if (!candidata) throw new ErroIntegracao('Conecte a chave de API do Apollo no painel do Frederico.', 428);
    let r;
    try {
      r = await pedir(BASE + rota, {
        method: corpo ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Cache-Control': 'no-cache', 'x-api-key': candidata },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: AbortSignal.timeout(20000), redirect: 'error'
      });
    } catch (e) { throw new ErroIntegracao('Não consegui falar com o Apollo. Confira a internet e tente de novo.', 502); }
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) { conectado = false; throw new ErroIntegracao('O Apollo recusou a chave ou o acesso a esse recurso. Confira a chave e o plano da conta.', 403); }
      if (r.status === 422) throw new ErroIntegracao('O Apollo não aceitou os filtros. Revise e tente de novo.', 422);
      if (r.status === 429) throw new ErroIntegracao('Limite de consultas do Apollo atingido. Espere um pouco.', 429);
      throw new ErroIntegracao('O Apollo não concluiu a consulta.', 502);
    }
    try { return await r.json(); } catch (e) { throw new ErroIntegracao('O Apollo devolveu uma resposta inválida.', 502); }
  }

  async function conectar(candidata) {
    if (typeof candidata !== 'string' || candidata.trim().length < 8 || candidata.length > 600 || /[\r\n]/.test(candidata))
      throw new ErroIntegracao('Informe uma chave de API válida.');
    const c = candidata.trim();
    const saude = await chamar('auth/health', null, c);
    if (saude.healthy !== true || saude.is_logged_in !== true) throw new ErroIntegracao('O Apollo não confirmou a autenticação dessa chave.', 403);
    chave = c; conectado = true; verificadoEm = new Date().toISOString(); cache.clear();
    return status();
  }
  function desconectar() { chave = ''; conectado = false; verificadoEm = null; cache.clear(); return status(); }

  async function pesquisar(f = {}) {
    if (ocupado) throw new ErroIntegracao('Já tem uma pesquisa no Apollo em andamento.', 409);
    const cargos = lista(f.cargos), locais = lista(f.locais), dominios = lista(f.dominios);
    const faixas = (Array.isArray(f.funcionarios) ? f.funcionarios : []).filter(x => FAIXAS.includes(x));
    const palavras = String(f.palavras || '').trim().slice(0, 200);
    if (!cargos.length && !dominios.length && !palavras)
      throw new ErroIntegracao('Diga ao menos cargos, domínios ou palavras-chave: pesquisa sem direção só gasta limite.');
    if (dominios.some(d => !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(d)))
      throw new ErroIntegracao('Domínio no formato empresa.com.br, sem https e sem www.');
    const pagina = Math.max(1, Math.min(50, Number(f.pagina) || 1));
    const corpo = { page: pagina, per_page: 10 };
    if (cargos.length) corpo.person_titles = cargos;
    if (locais.length) corpo.organization_locations = locais;
    if (dominios.length) corpo.q_organization_domains_list = dominios;
    if (faixas.length) corpo.organization_num_employees_ranges = faixas;
    if (palavras) corpo.q_keywords = palavras;

    ocupado = true;
    try {
      if (!conectado) {
        if (!chave) throw new ErroIntegracao('Conecte a chave de API do Apollo no painel do Frederico.', 428);
        await conectar(chave);
      }
      const j = await chamar('mixed_people/api_search', corpo);
      const lote = crypto.randomUUID();
      const linhas = (Array.isArray(j.people) ? j.people : []).slice(0, 10).map((p, i) => ({
        id: lote + '-' + i,
        apolloId: String(p.id || ''),
        nome: [p.first_name, p.last_name || p.last_name_obfuscated].filter(Boolean).join(' ') || 'nome não disponibilizado',
        cargo: String(p.title || ''),
        empresa: String((p.organization && p.organization.name) || ''),
        dominio: String((p.organization && p.organization.primary_domain) || ''),
        local: [p.city, p.state, p.country].filter(Boolean).join(' / '),
        temEmail: p.has_email === true
      }));
      cache = new Map(linhas.map(l => [l.id, { l, vale: Date.now() + 30 * 60e3 }]));
      return { linhas, pagina, total: Number(j.total_entries || (j.pagination && j.pagination.total_entries) || linhas.length),
               aviso: 'Até 10 pessoas por página. Esta pesquisa não traz e-mail nem telefone; nenhum contato foi feito.' };
    } finally { ocupado = false; }
  }

  /** o resultado guardado da última pesquisa (vale 30 minutos) */
  function resultado(id) {
    const c = cache.get(id);
    if (!c || c.vale < Date.now()) throw new ErroIntegracao('Esse resultado expirou: refaça a pesquisa antes de importar.', 409);
    return c.l;
  }

  return { status, conectar, desconectar, pesquisar, resultado, FAIXAS };
}

module.exports = { criarApollo, FAIXAS };
