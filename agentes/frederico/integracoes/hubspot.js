/* ===========================================================
   integracoes/hubspot.js — o Frederico lendo o HubSpot

   Dois caminhos, nesta ordem:
   1) ESTAÇÃO: a estação HubSpot do escritório (http://127.0.0.1:4402 ou
      HUBSPOT_ESTACAO_URL) já autenticada. O Frederico só pede os
      registros a ela e nunca vê a credencial.
   2) DIRETO: uma Service Key / token de acesso digitado no painel do
      Frederico (ou HUBSPOT_ACCESS_TOKEN no ambiente). Fica só na memória
      do processo: não vai para data/crm.json, log ou resposta da API.

   Só leitura de contatos, empresas e negócios. Nada é criado, alterado
   ou excluído no HubSpot.
   Doc: https://developers.hubspot.com/docs/api/crm/contacts
   =========================================================== */
'use strict';

const RECURSOS = {
  contacts:  { nome: 'Contatos', objeto: '0-1', props: ['firstname', 'lastname', 'email', 'company', 'jobtitle'] },
  companies: { nome: 'Empresas', objeto: '0-2', props: ['name', 'domain', 'industry', 'city'] },
  deals:     { nome: 'Negócios', objeto: '0-3', props: ['dealname', 'amount', 'dealstage', 'closedate'] }
};

class ErroIntegracao extends Error {
  constructor(msg, status) { super(msg); this.status = status || 400; }
}

function criarHubSpot({ tokenInicial = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_PRIVATE_APP_TOKEN || '',
                        estacao = process.env.HUBSPOT_ESTACAO_URL || 'http://127.0.0.1:4402',
                        pedir = fetch } = {}) {
  let token = String(tokenInicial).trim(), direto = false, conta = null, verificadoEm = null;

  /* ---------- a estação do escritório ---------- */
  async function statusEstacao() {
    try {
      const r = await pedir(estacao + '/api/status', { signal: AbortSignal.timeout(2500), redirect: 'error' });
      if (!r.ok) return null;
      const s = await r.json();
      return s && s.authenticated === true ? s : null;
    } catch (e) { return null; }
  }

  /* ---------- a API do HubSpot, direto ---------- */
  async function get(rota, credencial = token) {
    if (!credencial) throw new ErroIntegracao('Conecte o HubSpot primeiro.', 428);
    let r;
    try {
      r = await pedir('https://api.hubapi.com/' + rota, {
        headers: { Authorization: 'Bearer ' + credencial, Accept: 'application/json' },
        signal: AbortSignal.timeout(20000), redirect: 'error'
      });
    } catch (e) { throw new ErroIntegracao('Não consegui falar com o HubSpot. Confira a internet e tente de novo.', 502); }
    if (!r.ok) {
      if (r.status === 401) { direto = false; throw new ErroIntegracao('O HubSpot recusou a credencial.', 401); }
      if (r.status === 403) throw new ErroIntegracao('A credencial não tem permissão de leitura para esse recurso.', 403);
      if (r.status === 429) throw new ErroIntegracao('Limite de consultas do HubSpot atingido. Espere um pouco.', 429);
      throw new ErroIntegracao('O HubSpot não concluiu a consulta.', 502);
    }
    try { return await r.json(); } catch (e) { throw new ErroIntegracao('O HubSpot devolveu uma resposta inválida.', 502); }
  }

  async function conectar({ token: candidato, portalId } = {}) {
    if (typeof candidato !== 'string' || candidato.trim().length < 8 || candidato.length > 1000 || /[\r\n]/.test(candidato))
      throw new ErroIntegracao('Informe uma Service Key ou token de acesso válido.');
    const t = candidato.trim();
    const id = String(portalId || '').trim();
    if (id && !/^\d{1,20}$/.test(id)) throw new ErroIntegracao('O Hub ID tem só números.');
    let det = null;
    try { det = await get('account-info/v3/details', t); } catch (e) { if (![401, 403].includes(e.status)) throw e; }
    // a autenticação só vale depois de uma leitura de verdade
    const teste = await get('crm/v3/objects/contacts?limit=1&properties=hs_object_id&archived=false', t);
    if (!Array.isArray(teste.results)) throw new ErroIntegracao('Não consegui confirmar a leitura de contatos.', 502);
    const achado = det && det.portalId ? String(det.portalId) : '';
    if (achado && id && achado !== id) throw new ErroIntegracao('O Hub ID informado não é o da conta dessa credencial.');
    const ui = /^app(?:-[a-z0-9]+)?\.hubspot\.com$/.test((det && det.uiDomain) || '') ? det.uiDomain : 'app.hubspot.com';
    conta = { portalId: achado || id || null, uiDomain: ui, idVerificado: !!achado };
    token = t; direto = true; verificadoEm = new Date().toISOString();
    return status();
  }

  function desconectar() { token = ''; direto = false; conta = null; verificadoEm = null; return status(); }

  async function status() {
    if (direto) return { conectado: true, modo: 'direto', conta, verificadoEm, escrita: false };
    const s = await statusEstacao();
    if (s) return { conectado: true, modo: 'estacao', estacao, conta: s.account ? { portalId: s.account.portalId, uiDomain: s.account.uiDomain } : null,
                    verificadoEm: s.verifiedAt || null, leituraConfirmada: s.readConfirmed || [], escrita: false };
    // token no ambiente, ainda não testado: testa na primeira consulta
    return { conectado: false, modo: token ? 'direto-pendente' : null, escrita: false };
  }

  const link = (rec, id) => conta && conta.portalId
    ? `https://${conta.uiDomain}/contacts/${conta.portalId}/record/${RECURSOS[rec].objeto}/${encodeURIComponent(id)}` : null;

  /** uma página de registros (até 20), com cursor para a próxima */
  async function listar(recurso, depois) {
    if (!RECURSOS[recurso]) throw new ErroIntegracao('Recurso inválido: use contacts, companies ou deals.');
    const cursor = String(depois || '');
    if (cursor.length > 300 || /[\r\n]/.test(cursor)) throw new ErroIntegracao('Cursor de página inválido.');

    if (!direto) {
      const s = await statusEstacao();
      if (s) {
        let r;
        try {
          r = await pedir(`${estacao}/api/records?resource=${recurso}${cursor ? '&after=' + encodeURIComponent(cursor) : ''}`,
                          { signal: AbortSignal.timeout(25000), redirect: 'error' });
        } catch (e) { throw new ErroIntegracao('A estação HubSpot do escritório não respondeu.', 502); }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new ErroIntegracao(j.error || 'A estação HubSpot não concluiu a consulta.', r.status);
        return { recurso, origem: 'estação HubSpot do escritório', proxima: j.next || null,
                 linhas: (j.rows || []).map(x => ({ id: x.id, props: x.properties || {}, url: x.url || null })) };
      }
      if (token) await conectar({ token });
      else throw new ErroIntegracao('O HubSpot não está conectado: ligue a estação HubSpot do escritório ou informe uma Service Key.', 428);
    }
    const q = new URLSearchParams({ limit: '20', properties: RECURSOS[recurso].props.join(','), archived: 'false' });
    if (cursor) q.set('after', cursor);
    const j = await get(`crm/v3/objects/${recurso}?${q}`);
    return { recurso, origem: 'HubSpot (conexão direta)', proxima: (j.paging && j.paging.next && j.paging.next.after) || null,
             linhas: (j.results || []).map(x => ({ id: String(x.id), props: x.properties || {}, url: link(recurso, x.id) })) };
  }

  return { status, conectar, desconectar, listar };
}

/* etapas do pipeline padrão do HubSpot -> pipeline do Frederico */
const ETAPA_HUBSPOT = {
  appointmentscheduled: 'Contato', qualifiedtobuy: 'Qualificado', presentationscheduled: 'Proposta',
  decisionmakerboughtin: 'Negociação', contractsent: 'Negociação', closedwon: 'Ganho', closedlost: 'Perdido'
};

module.exports = { criarHubSpot, RECURSOS, ETAPA_HUBSPOT, ErroIntegracao };
