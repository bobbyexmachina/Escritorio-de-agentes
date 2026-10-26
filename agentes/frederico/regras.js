/* ===========================================================
   regras.js — o sistema comercial do Frederico (Comercial & CRM)

   - Qualificação com critérios explícitos: necessidade, prioridade,
     capacidade, timing e aderência.
   - Pipeline simples: Novo > Contato > Qualificado > Proposta >
     Negociação > Ganho/Perdido (as do meio podem ser renomeadas).
   - Toda oportunidade aberta tem próximo passo, data e motivo.
   - Preço, condição e prazo só entram se o usuário informou: nada é
     inventado. Nada aqui envia mensagem: tudo é texto para copiar.

   Usado pelo servidor (painel) e pelo relatorio.js (linha de comando).
   =========================================================== */
'use strict';

const NI = 'não informado';
const ETAPAS_PADRAO = ['Novo', 'Contato', 'Qualificado', 'Proposta', 'Negociação'];
const FECHADAS = ['Ganho', 'Perdido'];

const CRITERIOS = [
  ['necessidade', 'Necessidade', 'Tem um problema real que o serviço resolve?'],
  ['prioridade', 'Prioridade', 'Resolver isso é prioridade agora para eles?'],
  ['capacidade', 'Capacidade', 'Tem orçamento e poder de decisão (ou acesso a quem decide)?'],
  ['timing', 'Timing', 'O prazo deles cabe no nosso ciclo de produção?'],
  ['aderencia', 'Aderência', 'Combina com o perfil de cliente ideal (ICP)?']
];

/* colunas do CRM padrão, na ordem do descritivo */
const COLUNAS = [
  ['nome', 'Nome/Empresa'], ['contato', 'Contato'], ['origem', 'Origem'], ['necessidade', 'Necessidade'],
  ['fit', 'Fit'], ['etapa', 'Etapa'], ['ultimaInteracao', 'Última interação'], ['proximoPasso', 'Próximo passo'],
  ['dataProximoPasso', 'Data do próximo passo'], ['valorPotencial', 'Valor potencial informado'],
  ['objecao', 'Objeção'], ['observacoes', 'Observações']
];

const PERGUNTAS = [
  ['produto', 'Produto / serviço que você vende'],
  ['ticketMedio', 'Ticket médio'],
  ['publicoIdeal', 'Público ideal (quem compra e quem decide)'],
  ['origemLeads', 'De onde vêm os leads hoje'],
  ['cicloVenda', 'Ciclo de venda (do primeiro contato ao fechamento)'],
  ['canalPrincipal', 'Canal principal de vendas'],
  ['volumeLeads', 'Volume aproximado de leads por mês'],
  ['etapasFunil', 'Etapas que o funil tem hoje'],
  ['objecoes', 'Objeções mais frequentes'],
  ['metaComercial', 'Meta comercial']
];

/* ---------- utilidades ---------- */
const num = v => (v === null || v === undefined || v === '' || !isFinite(Number(v))) ? null : Number(v);
const hojeISO = () => new Date().toISOString().slice(0, 10);
const diasEntre = (a, b) => (a && b) ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : null;
const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const primeiroNome = s => String(s || '').split(/[\s/–-]+/)[0] || '';

function formatador(moeda) {
  let f; try { f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda || 'BRL' }); } catch (e) { f = null; }
  return v => v === null || v === undefined ? NI : (f ? f.format(v) : Number(v).toLocaleString('pt-BR'));
}

function etapasDe(emp) {
  const custom = String((emp && emp.etapasPipeline) || '').split(/[>,;\n]/).map(s => s.trim()).filter(Boolean)
    .filter(s => !FECHADAS.map(f => f.toLowerCase()).includes(s.toLowerCase()));
  return [...(custom.length ? custom : ETAPAS_PADRAO), ...FECHADAS];
}

function faltaOnboarding(emp) {
  emp = emp || {};
  return PERGUNTAS.filter(([k]) => !String(emp[k] || '').trim()).map(([campo, pergunta]) => ({ campo, pergunta }));
}

/* ===========================================================
   QUALIFICAÇÃO — 0 não · 1 em parte · 2 sim · vazio = não avaliado
   =========================================================== */
function fit(lead) {
  const q = lead.qualificacao || {};
  const notas = CRITERIOS.map(([k]) => num(q[k]));
  const avaliados = notas.filter(n => n !== null);
  const pontos = avaliados.reduce((s, n) => s + n, 0);
  const falta = CRITERIOS.filter(([k]) => num(q[k]) === null).map(([, n]) => n);
  let nivel = 'não avaliado';
  if (avaliados.length) {
    const prop = pontos / (avaliados.length * 2);
    nivel = prop >= .8 ? 'alto' : prop >= .5 ? 'médio' : 'baixo';
  }
  return { pontos, maximo: avaliados.length * 2, nivel, falta, completo: !falta.length,
           texto: avaliados.length ? `${nivel} (${pontos}/${avaliados.length * 2}${falta.length ? `, faltam ${falta.join(', ').toLowerCase()}` : ''})` : 'não avaliado' };
}

/* ===========================================================
   UM LEAD NO FORMATO DE RESPOSTA
   Diagnóstico; Etapa do funil; Próximo objetivo; Mensagem sugerida;
   Próximo passo; Data recomendada; Risco de perda.
   =========================================================== */
const OBJETIVO = {
  Novo: 'Fazer o primeiro contato e entender se há uma necessidade real.',
  Contato: 'Marcar uma conversa de diagnóstico para qualificar (necessidade, prioridade, capacidade, timing).',
  Qualificado: 'Levantar escopo e prazo para montar a proposta.',
  Proposta: 'Ouvir o retorno sobre a proposta e descobrir o que falta para decidir.',
  'Negociação': 'Resolver a objeção real e acertar condições e assinatura.'
};
const PRAZO = { Novo: 1, Contato: 2, Qualificado: 2, Proposta: 3, 'Negociação': 2 };

function analisarLead(lead, emp) {
  emp = emp || {};
  const etapas = etapasDe(emp);
  const hoje = hojeISO();
  const f = fit(lead);
  const din = formatador(emp.moeda);
  const aberta = !FECHADAS.includes(lead.etapa);
  const parado = diasEntre(lead.ultimaInteracao || lead.criadoEm, hoje);
  const idx = etapas.indexOf(lead.etapa);
  const etapaRef = ETAPAS_PADRAO[Math.min(Math.max(idx, 0), ETAPAS_PADRAO.length - 1)];

  // diagnóstico só com o que está registrado
  const diag = [];
  diag.push(lead.necessidade ? `Necessidade registrada: ${lead.necessidade}.` : 'Necessidade ainda não registrada.');
  diag.push(`Fit ${f.texto}.`);
  if (lead.objecao) diag.push(`Objeção em aberto: ${lead.objecao}.`);
  if (parado !== null) diag.push(parado === 0 ? 'Última interação foi hoje.' : `${parado} dia(s) desde a última interação.`);
  if (num(lead.valorPotencial) !== null) diag.push(`Valor potencial informado: ${din(num(lead.valorPotencial))}.`);

  // risco de perda, com os motivos
  const motivos = [];
  if (aberta && !String(lead.proximoPasso || '').trim()) motivos.push('sem próximo passo definido');
  if (aberta && lead.dataProximoPasso && lead.dataProximoPasso < hoje) motivos.push(`follow-up atrasado desde ${lead.dataProximoPasso}`);
  if (aberta && parado !== null && parado > 14) motivos.push(`${parado} dias sem interação`);
  if (f.nivel === 'baixo') motivos.push('fit baixo');
  if (lead.objecao && ['Proposta', 'Negociação'].includes(etapaRef)) motivos.push('objeção sem resposta na fase de decisão');
  const medio = [];
  if (aberta && parado !== null && parado > 7 && parado <= 14) medio.push(`${parado} dias sem interação`);
  if (!f.completo) medio.push('qualificação incompleta');
  const risco = !aberta ? (lead.etapa === 'Ganho' ? 'nenhum (ganho)' : 'perdido')
    : motivos.length ? 'alto — ' + motivos.join('; ')
    : medio.length ? 'médio — ' + medio.join('; ') : 'baixo';

  const dataRec = lead.dataProximoPasso && lead.dataProximoPasso >= hoje ? lead.dataProximoPasso : somaDias(hoje, PRAZO[etapaRef] || 2);

  return {
    id: lead.id, nome: lead.nome, aberta,
    diagnostico: diag.join(' '),
    etapa: lead.etapa,
    objetivo: aberta ? (OBJETIVO[etapaRef] || 'Avançar para a próxima etapa.') : (lead.etapa === 'Ganho' ? 'Entregar bem e pedir indicação.' : `Registrar o motivo da perda${lead.motivoPerda ? ` (${lead.motivoPerda})` : ''} e combinar se vale um contato futuro.`),
    mensagem: aberta ? mensagem(lead, emp, etapaRef) : '',
    proximoPasso: lead.proximoPasso || (aberta ? 'não definido — defina um' : '—'),
    dataRecomendada: aberta ? dataRec : '—',
    risco, fit: f, parado
  };
}

/* mensagem para o usuário revisar e enviar ele mesmo. Sem pressão, sem
   promessa, sem preço que não foi informado. Assinada por quem envia. */
function mensagem(lead, emp, etapa) {
  const nome = primeiroNome(lead.contato || lead.nome) || 'tudo bem';
  const empresa = emp.nomeEmpresa || 'a nossa produtora';
  const nec = lead.necessidade ? String(lead.necessidade).replace(/\.$/, '').toLowerCase() : null;
  const assina = '\n\n[seu nome]';
  switch (etapa) {
    case 'Novo':
      return `Oi, ${nome}! Aqui é da ${empresa}.${nec ? ` Vi que vocês estão com ${nec}.` : ''} ` +
        `Faz sentido uma conversa rápida para eu entender o que vocês precisam e ver se conseguimos ajudar?` + assina;
    case 'Contato':
      return `Oi, ${nome}! Para eu não te mandar nada genérico, queria entender melhor: qual é o objetivo do vídeo, ` +
        `para quando vocês precisam e quem participa da decisão? Se preferir, a gente resolve isso numa ligação de 20 minutos. Qual horário fica bom?` + assina;
    case 'Qualificado':
      return `Oi, ${nome}! Com o que conversamos${nec ? ` sobre ${nec}` : ''}, já consigo montar a proposta. ` +
        `Só confirmo dois pontos antes: o prazo de entrega e onde o vídeo vai ser veiculado. Pode me responder por aqui?` + assina;
    case 'Proposta':
      return `Oi, ${nome}! Conseguiu olhar a proposta? Se alguma parte do escopo não ficou clara ou não encaixa no que vocês precisam, ` +
        `me diz qual que eu ajusto. Se o momento mudou, também tudo bem — só me avisa.` + assina;
    default:
      return `Oi, ${nome}!${lead.objecao ? ` Sobre o ponto que você levantou (${String(lead.objecao).toLowerCase()}), quero entender melhor o que pesa mais para vocês antes de propor qualquer ajuste.` : ' Ficou algum ponto em aberto para vocês decidirem?'} ` +
        `Assim a gente vê juntos se existe um caminho que funcione.` + assina;
  }
}

/* ===========================================================
   PROPOSTA — problema, solução, escopo, condição informada e CTA
   =========================================================== */
function proposta(lead, emp, extra) {
  emp = emp || {}; extra = extra || {};
  const din = formatador(emp.moeda);
  const faltam = [];
  const problema = lead.necessidade || (faltam.push('necessidade do cliente'), '[descreva o problema do cliente]');
  const solucao = extra.solucao || emp.produto || (faltam.push('qual serviço será entregue'), '[serviço proposto]');
  const escopo = String(extra.escopo || '').trim() || (faltam.push('escopo (entregáveis, duração, versões, prazos)'), '[entregáveis, duração, nº de versões e prazo]');
  const valor = num(extra.valor);
  const condicao = valor !== null
    ? `${din(valor)}${extra.pagamento ? ` — ${extra.pagamento}` : ''}${extra.validade ? ` (proposta válida até ${extra.validade})` : ''}`
    : (faltam.push('valor e forma de pagamento'), '[valor e forma de pagamento — informe; não invento preço]');
  const prazo = extra.prazo || (faltam.push('prazo de entrega'), '[prazo de entrega]');
  const texto = [
    `PROPOSTA — ${lead.nome}`, '',
    'O desafio', problema, '',
    'O que propomos', solucao, '',
    'Escopo', escopo, '',
    'Prazo', prazo, '',
    'Investimento', condicao, '',
    'Próximo passo',
    `Se fizer sentido, responda esta mensagem para agendarmos o início${extra.cta ? ` — ${extra.cta}` : ''}. Se algo não encaixar, me diga o quê que eu reviso o escopo.`,
    '', emp.nomeEmpresa || '[sua empresa]'
  ].join('\n');
  return { texto, faltam };
}

/* ===========================================================
   ANÁLISE DO PIPELINE
   =========================================================== */
function analisar(dados) {
  const emp = dados.empresa || {};
  const leads = Array.isArray(dados.leads) ? dados.leads : [];
  const etapas = etapasDe(emp);
  const din = formatador(emp.moeda);
  const hoje = hojeISO();

  // quantos chegaram a cada etapa (pelo histórico ou pela etapa atual)
  const ordem = etapas.slice(0, -2);
  const alcancou = ordem.map(() => 0);
  for (const l of leads) {
    let max = -1;
    const passou = [l.etapa, ...(l.historico || []).map(h => h.para)];
    for (const e of passou) {
      const i = e === 'Ganho' ? ordem.length - 1 : ordem.indexOf(e);
      if (i > max) max = i;
    }
    for (let i = 0; i <= max; i++) alcancou[i]++;
  }
  const conversao = ordem.slice(0, -1).map((e, i) => ({
    de: e, para: ordem[i + 1], entraram: alcancou[i], avancaram: alcancou[i + 1],
    taxa: alcancou[i] ? alcancou[i + 1] / alcancou[i] : null
  }));
  const ganhos = leads.filter(l => l.etapa === 'Ganho'), perdidos = leads.filter(l => l.etapa === 'Perdido');
  const winRate = (ganhos.length + perdidos.length) ? ganhos.length / (ganhos.length + perdidos.length) : null;

  const porEtapa = etapas.map(e => {
    const ls = leads.filter(l => l.etapa === e);
    const vals = ls.map(l => num(l.valorPotencial)).filter(v => v !== null);
    return { etapa: e, qtd: ls.length, valor: vals.reduce((s, v) => s + v, 0), semValor: ls.length - vals.length };
  });

  const abertos = leads.filter(l => !FECHADAS.includes(l.etapa)).map(l => analisarLead(l, emp));
  const followups = {
    atrasados: abertos.filter(a => { const l = leads.find(x => x.id === a.id); return l.dataProximoPasso && l.dataProximoPasso < hoje; }),
    hoje: abertos.filter(a => leads.find(x => x.id === a.id).dataProximoPasso === hoje),
    semana: abertos.filter(a => { const d = leads.find(x => x.id === a.id).dataProximoPasso; return d && d > hoje && d <= somaDias(hoje, 7); }),
    semPasso: abertos.filter(a => { const l = leads.find(x => x.id === a.id); return !String(l.proximoPasso || '').trim() || !l.dataProximoPasso; })
  };
  const parados = abertos.filter(a => a.parado !== null && a.parado > 14).sort((a, b) => b.parado - a.parado);

  const contar = arr => Object.entries(arr.reduce((m, k) => (k ? (m[k] = (m[k] || 0) + 1) : 0, m), {})).sort((a, b) => b[1] - a[1]);
  const motivosPerda = contar(perdidos.map(l => (l.motivoPerda || 'sem motivo registrado').trim()));
  const objecoes = contar(leads.map(l => (l.objecao || '').trim()).filter(Boolean));
  const origens = contar(leads.map(l => (l.origem || 'não informada').trim())).map(([o, n]) => {
    const g = leads.filter(l => (l.origem || 'não informada').trim() === o && l.etapa === 'Ganho').length;
    return { origem: o, leads: n, ganhos: g, taxa: n ? g / n : null };
  });

  const mes = hoje.slice(0, 7);
  const ganhoMes = ganhos.filter(l => (l.dataFechamento || l.ultimaInteracao || '').slice(0, 7) === mes)
    .reduce((s, l) => s + (num(l.valorPotencial) || 0), 0);
  const meta = num(emp.metaValor);

  const alertas = [];
  if (followups.atrasados.length) alertas.push({ nivel: 'alto', texto: `${followups.atrasados.length} follow-up(s) atrasado(s).` });
  if (followups.semPasso.length) alertas.push({ nivel: 'alto', texto: `${followups.semPasso.length} oportunidade(s) aberta(s) sem próximo passo ou sem data.` });
  if (parados.length) alertas.push({ nivel: 'medio', texto: `${parados.length} oportunidade(s) parada(s) há mais de 14 dias.` });
  const semQual = abertos.filter(a => !a.fit.completo && ['Qualificado', 'Proposta', 'Negociação'].includes(leads.find(l => l.id === a.id).etapa));
  if (semQual.length) alertas.push({ nivel: 'medio', texto: `${semQual.length} oportunidade(s) já passaram de Contato sem qualificação completa.` });
  if (perdidos.some(l => !l.motivoPerda)) alertas.push({ nivel: 'dado', texto: `${perdidos.filter(l => !l.motivoPerda).length} perda(s) sem motivo registrado: sem isso não dá para aprender com elas.` });

  return {
    etapas, onboarding: faltaOnboarding(emp), total: leads.length, abertos: abertos.length,
    porEtapa: porEtapa.map(p => Object.assign(p, { f: din(p.valor) })),
    conversao, winRate, ganhos: ganhos.length, perdidos: perdidos.length,
    followups, parados, motivosPerda, objecoes, origens, alertas,
    meta: { valor: meta, ganhoMes, f: { meta: din(meta), ganho: din(ganhoMes) }, pct: meta ? ganhoMes / meta : null, mes }
  };
}

/* ===========================================================
   RESUMO EM TEXTO (para o relatorio.js e para o chat)
   =========================================================== */
function resumo(dados) {
  const a = analisar(dados);
  const p = v => v === null ? NI : Math.round(v * 100) + '%';
  const L = [`# Comercial & CRM — ${(dados.empresa && dados.empresa.nomeEmpresa) || 'a empresa'} — ${hojeISO()}`, ''];
  if (a.onboarding.length) { L.push('## Onboarding pendente'); L.push(...a.onboarding.map(o => '- ' + o.pergunta), ''); }
  L.push('## Pipeline');
  L.push(...a.porEtapa.map(e => `- ${e.etapa}: ${e.qtd} (${e.f}${e.semValor ? `; ${e.semValor} sem valor informado` : ''})`));
  L.push('', '## Conversão por etapa');
  L.push(...a.conversao.map(c => `- ${c.de} → ${c.para}: ${c.avancaram}/${c.entraram} (${p(c.taxa)})`));
  L.push(`- Ganho x perdido: ${a.ganhos}/${a.ganhos + a.perdidos} (${p(a.winRate)})`);
  L.push('', `## Meta de ${a.meta.mes}: ${a.meta.f.ganho} de ${a.meta.f.meta} (${p(a.meta.pct)})`);
  L.push('', '## Alertas'); L.push(...(a.alertas.length ? a.alertas.map(x => `- [${x.nivel}] ${x.texto}`) : ['- Nenhum.']));
  L.push('', '## Follow-ups');
  const lin = x => `- ${x.nome} (${x.etapa}) — ${x.proximoPasso} — ${x.dataRecomendada} — risco ${x.risco}`;
  L.push('### Atrasados'); L.push(...(a.followups.atrasados.length ? a.followups.atrasados.map(lin) : ['- Nenhum.']));
  L.push('### Hoje'); L.push(...(a.followups.hoje.length ? a.followups.hoje.map(lin) : ['- Nenhum.']));
  L.push('### Próximos 7 dias'); L.push(...(a.followups.semana.length ? a.followups.semana.map(lin) : ['- Nenhum.']));
  L.push('### Sem próximo passo'); L.push(...(a.followups.semPasso.length ? a.followups.semPasso.map(lin) : ['- Nenhum.']));
  L.push('', '## Motivos de perda'); L.push(...(a.motivosPerda.length ? a.motivosPerda.map(([m, n]) => `- ${m}: ${n}`) : ['- Sem perdas registradas.']));
  L.push('', '## Objeções'); L.push(...(a.objecoes.length ? a.objecoes.map(([m, n]) => `- ${m}: ${n}`) : ['- Nenhuma registrada.']));
  return L.join('\n');
}

function leadTexto(lead, emp) {
  const a = analisarLead(lead, emp);
  return [`# ${lead.nome}`, '',
    `**Diagnóstico:** ${a.diagnostico}`, `**Etapa do funil:** ${a.etapa}`, `**Próximo objetivo:** ${a.objetivo}`,
    `**Mensagem sugerida:**`, a.mensagem || '—', `**Próximo passo:** ${a.proximoPasso}`,
    `**Data recomendada:** ${a.dataRecomendada}`, `**Risco de perda:** ${a.risco}`].join('\n');
}

module.exports = { analisar, analisarLead, proposta, fit, resumo, leadTexto, etapasDe, faltaOnboarding,
                   CRITERIOS, COLUNAS, PERGUNTAS, ETAPAS_PADRAO, FECHADAS, NI };
