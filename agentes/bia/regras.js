/* ===========================================================
   regras.js — o sistema de atendimento da Bia (Atendimento & Sucesso)

   Triagem -> contexto -> resposta -> resolução -> escalonamento ->
   base de conhecimento -> sucesso do cliente -> feedback.
   Regras que valem para tudo:
   - só política, prazo, preço ou condição CONFIRMADOS na base de
     conhecimento; o resto vira pergunta ou escalonamento;
   - nada de dizer que reembolsou, cancelou, alterou ou enviou;
   - o mínimo de dado pessoal; nunca senha, código ou cartão completo.

   A triagem automática é uma SUGESTÃO por palavras-chave: quem decide é
   a pessoa que atende. Usado pelo servidor e pelo relatorio.js.
   =========================================================== */
'use strict';

const NI = 'não informado';
const preenchido = v => String(v == null ? '' : v).trim() !== '';
const hojeISO = () => new Date().toISOString().slice(0, 10);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const PERGUNTAS = [
  ['nicho', 'Empresa / nicho'],
  ['produtos', 'Produtos e serviços'],
  ['canais', 'Canais de atendimento'],
  ['horarios', 'Horários e regras de atendimento'],
  ['tom', 'Tom de voz'],
  ['duvidas', 'Principais dúvidas dos clientes'],
  ['politicas', 'Políticas oficiais (prazos, revisões, pagamento, cancelamento)'],
  ['humano', 'Situações que exigem uma pessoa'],
  ['materiais', 'Materiais de referência']
];
function faltaOnboarding(emp) {
  emp = emp || {};
  return PERGUNTAS.filter(([k]) => !preenchido(emp[k])).map(([campo, pergunta]) => ({ campo, pergunta }));
}

const CATEGORIAS = [
  ['orcamento', 'Orçamento / comercial', /or[cç]amento|pre[cç]o|quanto custa|valor|proposta|cota[cç]/],
  ['prazo', 'Prazo / entrega', /prazo|entrega|atras|quando fica|data|cronograma/],
  ['revisao', 'Revisão / ajuste', /revis|ajust|altera[cç]|mudar|trocar|corre[cç]/],
  ['arquivo', 'Arquivo / acesso', /arquivo|link|download|baixar|formato|drive|acesso/],
  ['financeiro', 'Pagamento / nota', /pagamento|boleto|pix|nota fiscal|\bnf\b|fatura|cobran|parcela/],
  ['cancelamento', 'Cancelamento / reembolso', /cancel|reembols|estorn|devolu|desist/],
  ['reclamacao', 'Reclamação', /reclam|insatisf|pessim|absurd|decepcion|horrivel|nao gostei|descaso/],
  ['duvida', 'Dúvida geral', /./]
];
const PRIORIDADES = ['baixa', 'média', 'alta', 'crítica'];
const STATUS = ['aberto', 'aguardando cliente', 'escalado', 'resolvido'];

/* ===========================================================
   TRIAGEM — assunto, urgência, sentimento e risco
   =========================================================== */
function triar(mensagem, faq) {
  const t = norm(mensagem);
  const cat = CATEGORIAS.find(([, , re]) => re.test(t));
  const urgente = /urgent|hoje|amanha|agora|imediat|o quanto antes|asap|ja passou|atrasad/.test(t);
  const negativo = /absurd|pessim|horrivel|decepcion|insatisf|raiva|descaso|vergonha|nunca mais|!!+|enganad|lament/.test(t);
  const positivo = /obrigad|adorei|amei|otimo|excelente|perfeito|parabens/.test(t);
  const sentimento = negativo ? 'negativo' : positivo ? 'positivo' : 'neutro';

  const riscos = [];
  if (/advogad|processo|procon|judicial|justica|juridic|notifica[cç]ao extrajudicial|direitos? do consumidor/.test(t)) riscos.push('jurídico');
  if (/reembols|estorn|cobran[cç]a indevida|cobrado (duas|2) vezes|chargeback|devolu[cç]ao do dinheiro/.test(t)) riscos.push('cobrança sensível');
  if (negativo && (cat[0] === 'reclamacao' || cat[0] === 'cancelamento')) riscos.push('conflito');
  if (/excec|abrir mao|so dessa vez|desconto especial|fora da regra/.test(t)) riscos.push('pedido de exceção');
  if (/senha|codigo de (verifica|autentica|seguran)|\b\d{13,19}\b|cvv/.test(t)) riscos.push('dado sensível na mensagem');
  if (/imagem|direito autoral|uso de imagem|vazou|lgpd|privacidade/.test(t)) riscos.push('privacidade / direitos');

  const prioridade = riscos.includes('jurídico') || (riscos.includes('conflito') && urgente) ? 'crítica'
    : urgente || riscos.length || negativo ? 'alta'
    : positivo || cat[0] === 'duvida' ? 'baixa' : 'média';

  const resposta = respostaConfirmada(mensagem, faq);
  // elogio sem pergunta não precisa de política nenhuma: é só agradecer
  const elogio = positivo && !negativo && !riscos.length && !/\?/.test(String(mensagem));
  const motivos = [...riscos];
  if (!resposta && !elogio) motivos.push('informação não confirmada na base de conhecimento');
  return {
    categoria: cat[0], categoriaNome: cat[1], urgencia: urgente ? 'alta' : 'normal', sentimento, riscos, prioridade,
    precisaHumano: riscos.some(r => r !== 'dado sensível na mensagem') || (!resposta && !elogio),
    motivo: motivos.join('; ') || (elogio ? 'elogio: só agradecer' : 'resolvível com regra confirmada'),
    faq: resposta ? { id: resposta.id, pergunta: resposta.pergunta } : null,
    sugestao: elogio ? 'Que bom ler isso! Obrigada pelo retorno — vou repassar para a equipe que trabalhou no seu projeto.' : rascunho(mensagem, resposta, riscos)
  };
}

/** a entrada CONFIRMADA da base que mais parece com a mensagem */
function respostaConfirmada(mensagem, faq) {
  const palavras = new Set(norm(mensagem).split(/\W+/).filter(p => p.length > 3));
  let melhor = null, nota = 0;
  for (const f of (faq || []).filter(f => f.confirmada)) {
    const chaves = norm(f.pergunta + ' ' + (f.palavras || '')).split(/\W+/).filter(p => p.length > 3);
    const n = chaves.filter(p => palavras.has(p)).length;
    if (n > nota) { nota = n; melhor = f; }
  }
  return nota >= 2 ? melhor : null;
}

function rascunho(mensagem, faq, riscos) {
  const sens = riscos.includes('dado sensível na mensagem')
    ? '\n\nPor segurança, não envie senha, código de verificação ou número completo de cartão por aqui — não precisamos dessas informações.' : '';
  if (riscos.includes('jurídico') || riscos.includes('conflito') || riscos.includes('cobrança sensível'))
    return `Oi! Obrigada por nos contar, e sinto muito pelo transtorno. Já passei o seu caso para a pessoa responsável, que vai analisar com cuidado e falar com você. Para agilizar, pode me confirmar o nome do projeto e a data aproximada do pedido?${sens}`;
  if (faq) return `Oi! ${faq.resposta}\n\nSe ainda ficar alguma dúvida, é só me chamar.${sens}`;
  return `Oi! Obrigada pela mensagem. Para te responder certinho, vou confirmar essa informação com a equipe e já te retorno. Enquanto isso, pode me dizer o nome do projeto ou do pedido?${sens}`;
}

/* ===========================================================
   CONFERÊNCIA DA RESPOSTA — tom, promessa de ação e privacidade
   =========================================================== */
const CONFERE = [
  [/\b(reembolsei|estornei|cancelei|alterei|enviei|j[aá] (foi|est[aá]) (reembolsad|cancelad|alterad|enviad)|reembolso (foi )?(feito|realizado|efetuado)|cancelamento (foi )?(feito|realizado|efetuado))/i,
   'diz que uma ação foi executada: só com confirmação da ferramenta'],
  [/\bsenha\b|c[oó]digo de (verifica|autentica|seguran)|n[uú]mero (completo )?do cart[aã]o|\bcvv\b/i,
   'pede dado proibido (senha, código ou cartão): remova'],
  [/conforme (j[aá] )?(informado|dito)|como j[aá] (dissemos|informamos|foi dito)|prezad[oa] cliente|a culpa [eé]|voc[eê] deveria ter|n[aã]o [eé] nossa responsabilidade/i,
   'tom robótico, passivo-agressivo ou de culpa: reescreva como uma pessoa'],
  [/garant(o|imos) que|com certeza (vai|fica)|sem falta (at[eé]|amanh)/i,
   'promessa de prazo ou resultado: só se a política confirmar']
];
const conferir = t => CONFERE.filter(([re]) => re.test(String(t || ''))).map(([, m]) => m);

/* ===========================================================
   ANÁLISE: fila, base de conhecimento e feedback
   =========================================================== */
function analisar(dados) {
  const emp = dados.empresa || {};
  const faq = dados.faq || [];
  const casos = (dados.casos || []).map(c => Object.assign({}, c, { alertas: conferir(c.resposta) }));
  const ordem = p => PRIORIDADES.length - PRIORIDADES.indexOf(p);
  const abertos = casos.filter(c => c.status !== 'resolvido')
    .sort((a, b) => (ordem(a.prioridade) - ordem(b.prioridade)) || String(a.data).localeCompare(String(b.data)));

  // feedback: reclamações e dúvidas por tema
  const porTema = {};
  for (const c of casos) {
    const tema = (c.tema || '').trim() || (CATEGORIAS.find(x => x[0] === c.categoria) || [, 'sem categoria'])[1];
    const t = porTema[tema] || (porTema[tema] = { tema, total: 0, reclamacoes: 0, abertos: 0, humano: 0 });
    t.total++; if (c.categoria === 'reclamacao' || c.sentimento === 'negativo') t.reclamacoes++;
    if (c.status !== 'resolvido') t.abertos++; if (c.precisaHumano) t.humano++;
  }
  const temas = Object.values(porTema).sort((a, b) => b.total - a.total);

  // base de conhecimento: o que se repete e ainda não tem resposta-padrão confirmada
  const sugestoesFaq = temas.filter(t => t.total >= 3 &&
    !faq.some(f => f.confirmada && norm(f.pergunta + ' ' + (f.tema || '')).includes(norm(t.tema).split(' ')[0])))
    .map(t => `${t.tema}: ${t.total} caso(s) — vale virar FAQ com resposta confirmada.`);

  const alertas = [];
  const criticos = abertos.filter(c => c.prioridade === 'crítica');
  if (criticos.length) alertas.push({ nivel: 'alto', texto: `${criticos.length} caso(s) crítico(s) aberto(s).` });
  const humanoSemEscalar = abertos.filter(c => c.precisaHumano && c.status !== 'escalado');
  if (humanoSemEscalar.length) alertas.push({ nivel: 'alto', texto: `${humanoSemEscalar.length} caso(s) que precisam de uma pessoa e ainda não foram escalados.` });
  const respostasRuins = casos.filter(c => c.alertas.length && c.status !== 'resolvido');
  if (respostasRuins.length) alertas.push({ nivel: 'medio', texto: `${respostasRuins.length} resposta(s) com problema de tom, promessa de ação ou privacidade.` });
  const parados = abertos.filter(c => c.data && (Date.parse(hojeISO()) - Date.parse(c.data)) / 864e5 > 2 && c.status === 'aberto');
  if (parados.length) alertas.push({ nivel: 'medio', texto: `${parados.length} caso(s) aberto(s) há mais de 2 dias sem andamento.` });
  const naoConf = faq.filter(f => !f.confirmada);
  if (naoConf.length) alertas.push({ nivel: 'dado', texto: `${naoConf.length} resposta(s) da base ainda não confirmada(s): não são usadas nas respostas.` });

  return {
    hoje: hojeISO(), onboarding: faltaOnboarding(emp), casos, abertos, temas, sugestoesFaq, alertas,
    contagem: { abertos: abertos.length, escalados: casos.filter(c => c.status === 'escalado').length,
                aguardando: casos.filter(c => c.status === 'aguardando cliente').length,
                resolvidos: casos.filter(c => c.status === 'resolvido').length, faq: faq.filter(f => f.confirmada).length }
  };
}

/* ===========================================================
   UM CASO NO FORMATO PADRÃO
   Categoria; Prioridade; Resumo interno; Resposta ao cliente; Ação
   necessária; Precisa de humano?; Motivo.
   =========================================================== */
function casoTexto(c) {
  const v = x => preenchido(x) ? x : NI;
  const cat = (CATEGORIAS.find(x => x[0] === c.categoria) || [, c.categoria])[1];
  const al = conferir(c.resposta);
  return [`# Caso — ${v(c.cliente)} — ${v(c.data)}`, '',
    `**Categoria:** ${v(cat)}`, `**Prioridade:** ${v(c.prioridade)}`, `**Resumo interno:** ${v(c.resumo)}`,
    `**Resposta ao cliente:**`, v(c.resposta), `**Ação necessária:** ${v(c.acao)}`,
    `**Precisa de humano?** ${c.precisaHumano ? 'Sim' : 'Não'}`, `**Motivo:** ${v(c.motivo)}`,
    al.length ? `\n⚠ Revisar antes de enviar: ${al.join('; ')}` : ''].join('\n');
}

function resumo(dados) {
  const a = analisar(dados);
  const L = [`# Atendimento & Sucesso — ${a.hoje}`, ''];
  if (a.onboarding.length) L.push('> Falta no onboarding: ' + a.onboarding.map(o => o.pergunta.toLowerCase()).join('; ') + '.', '');
  L.push('## Fila', `- Abertos: ${a.contagem.abertos} · escalados: ${a.contagem.escalados} · aguardando cliente: ${a.contagem.aguardando} · resolvidos: ${a.contagem.resolvidos}`);
  L.push(...a.abertos.slice(0, 20).map(c => `- [${c.prioridade}] ${c.cliente || 'cliente'} — ${c.resumo || c.mensagem?.slice(0, 80) || ''} (${c.status}${c.precisaHumano ? ', precisa de humano' : ''})`));
  L.push('', '## Feedback por tema', ...(a.temas.length ? a.temas.map(t => `- ${t.tema}: ${t.total} caso(s), ${t.reclamacoes} com reclamação, ${t.abertos} aberto(s)`) : ['- Sem casos.']));
  if (a.sugestoesFaq.length) L.push('', '## Sugestões para a base de conhecimento', ...a.sugestoesFaq.map(s => '- ' + s));
  if (a.alertas.length) L.push('', '## Alertas', ...a.alertas.map(x => `- [${x.nivel}] ${x.texto}`));
  return L.join('\n');
}

module.exports = { triar, conferir, analisar, casoTexto, resumo, faltaOnboarding, respostaConfirmada,
                   PERGUNTAS, CATEGORIAS, PRIORIDADES, STATUS, NI };
