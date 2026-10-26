/* ===========================================================
   calc.js — os cálculos da Rosângela Maria (Financeiro & Performance)

   Regras que valem para tudo aqui:
   - só usa número que o usuário informou; o que falta vira "não informado";
   - todo cálculo devolve fórmula, entradas, resultado e interpretação;
   - nada de média de mercado: hipótese só existe nos cenários, e com nome.

   Usado pelo servidor (painel) e pelo relatorio.js (linha de comando).
   =========================================================== */
'use strict';

const NI = 'não informado';

/* ---------- utilidades ---------- */
const num = v => (v === null || v === undefined || v === '' || !isFinite(Number(v))) ? null : Number(v);
const soma = arr => arr.reduce((s, v) => s + v, 0);
const mesDe = d => (typeof d === 'string' && /^\d{4}-\d{2}/.test(d)) ? d.slice(0, 7) : null;
const hojeISO = () => new Date().toISOString().slice(0, 10);
function mesAnterior(m) {
  const [a, b] = m.split('-').map(Number);
  return b === 1 ? `${a - 1}-12` : `${a}-${String(b - 1).padStart(2, '0')}`;
}
function mesSeguinte(m) {
  const [a, b] = m.split('-').map(Number);
  return b === 12 ? `${a + 1}-01` : `${a}-${String(b + 1).padStart(2, '0')}`;
}
const pct = (a, b) => (a === null || b === null || b === 0) ? null : a / b;
const mediana = arr => {
  if (!arr.length) return null;
  const s = [...arr].sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* classes de lançamento e o lado do caixa que elas mexem */
const CLASSES = {
  receita:        { nome: 'Receita',            lado: 'entrada' },
  outra_entrada:  { nome: 'Outra entrada',      lado: 'entrada' },
  imposto:        { nome: 'Imposto sobre venda', lado: 'saida' },
  custo_variavel: { nome: 'Custo variável',     lado: 'saida' },
  custo_fixo:     { nome: 'Custo fixo',         lado: 'saida' },
  despesa:        { nome: 'Despesa',            lado: 'saida' },
  investimento:   { nome: 'Investimento',       lado: 'saida' },
  outra_saida:    { nome: 'Outra saída',        lado: 'saida' }
};

/** cria o formatador de dinheiro: com a moeda informada, ou só o número */
function formatador(moeda) {
  let f;
  try { f = moeda ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }) : null; }
  catch (e) { f = null; }
  const plano = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    din: v => v === null || v === undefined ? NI : (f ? f.format(v) : plano.format(v)),
    pct: v => v === null || v === undefined ? NI : (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%',
    n:   v => v === null || v === undefined ? NI : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  };
}

/** um cálculo no formato da regra: fórmula, entradas, resultado, interpretação */
const calculo = (id, titulo, formula, entradas, resultado, interpretacao) =>
  ({ id, titulo, formula, entradas, resultado, interpretacao,
     completo: entradas.every(e => e.valor !== NI) });

/* ===========================================================
   ONBOARDING — o que falta saber da empresa
   =========================================================== */
const PERGUNTAS = [
  ['nicho', 'Nicho / mercado de atuação'],
  ['modeloReceita', 'Modelo de receita (projeto, recorrência, diária…)'],
  ['produtos', 'Produtos e serviços vendidos'],
  ['moeda', 'Moeda (ex.: BRL)'],
  ['periodoInicio', 'Início do período analisado'],
  ['fontesReceita', 'Fontes de receita'],
  ['custosFixos', 'Principais custos fixos'],
  ['custosVariaveis', 'Principais custos variáveis'],
  ['registroAtual', 'Como os números são registrados hoje'],
  ['metas', 'Metas (receita, margem, caixa mínimo…)'],
  ['indicadores', 'Indicadores que já acompanha'],
  ['saldoInicial', 'Saldo de caixa no início do período']
];
function faltaOnboarding(emp) {
  emp = emp || {};
  return PERGUNTAS.filter(([k]) => {
    if (k === 'saldoInicial') return num(emp.saldoInicial) === null;
    if (k === 'metas') return !emp.metas && num(emp.metaReceita) === null && num(emp.metaMargem) === null && num(emp.caixaMinimo) === null;
    return !String(emp[k] || '').trim();
  }).map(([k, rot]) => ({ campo: k, pergunta: rot }));
}

/* ===========================================================
   CONSISTÊNCIA — validar antes de concluir
   =========================================================== */
function inconsistencias(lancs) {
  const hoje = hojeISO();
  const out = [];
  const vistos = new Map();
  for (const l of lancs) {
    const rot = `"${l.descricao || 'sem descrição'}" (${l.data || 'sem data'})`;
    if (!mesDe(l.data)) out.push({ id: l.id, texto: `${rot}: data ausente ou inválida` });
    if (num(l.valor) === null || num(l.valor) <= 0) out.push({ id: l.id, texto: `${rot}: valor ausente, zero ou negativo (use a classe para dizer se é entrada ou saída)` });
    if (!CLASSES[l.classe]) out.push({ id: l.id, texto: `${rot}: classe não reconhecida` });
    if (!String(l.categoria || '').trim()) out.push({ id: l.id, texto: `${rot}: sem categoria` });
    if (l.status === 'realizado' && l.data && l.data > hoje) out.push({ id: l.id, texto: `${rot}: marcado como realizado, mas a data é futura` });
    if (l.status === 'previsto' && l.data && l.data < hoje) out.push({ id: l.id, texto: `${rot}: previsto com data já passada — confirmar se aconteceu` });
    const chave = [l.data, l.valor, String(l.descricao || '').toLowerCase().trim(), l.classe].join('|');
    if (vistos.has(chave)) out.push({ id: l.id, texto: `${rot}: possível lançamento duplicado` });
    vistos.set(chave, true);
  }
  return out;
}

/* ===========================================================
   AGREGADOS POR MÊS
   =========================================================== */
function porMes(lancs, status) {
  const meses = {};
  for (const l of lancs) {
    const m = mesDe(l.data), v = num(l.valor);
    if (!m || v === null || v <= 0 || !CLASSES[l.classe]) continue;
    if (status && l.status !== status) continue;
    const r = meses[m] || (meses[m] = { mes: m, entradas: 0, saidas: 0, classes: {}, categorias: {} });
    const lado = CLASSES[l.classe].lado;
    if (lado === 'entrada') r.entradas += v; else r.saidas += v;
    r.classes[l.classe] = (r.classes[l.classe] || 0) + v;
    const cat = `${l.classe}::${(l.categoria || 'sem categoria').trim()}`;
    r.categorias[cat] = (r.categorias[cat] || 0) + v;
  }
  return meses;
}
const cls = (m, c) => (m && m.classes[c]) || 0;

/* ===========================================================
   ANÁLISE COMPLETA DE UM MÊS
   =========================================================== */
function analisar(dados, mesPedido) {
  const emp = dados.empresa || {};
  const lancs = Array.isArray(dados.lancamentos) ? dados.lancamentos : [];
  const orc = Array.isArray(dados.orcamento) ? dados.orcamento : [];
  const ops = Array.isArray(dados.operacao) ? dados.operacao : [];
  const F = formatador(emp.moeda);

  const real = porMes(lancs, 'realizado');
  const prev = porMes(lancs, 'previsto');
  const mesesReais = Object.keys(real).sort();
  const mes = mesPedido || mesesReais[mesesReais.length - 1] || hojeISO().slice(0, 7);
  const ant = mesAnterior(mes);
  const M = real[mes] || null, A = real[ant] || null;
  const temDados = !!M;

  /* ---------- 1) CAIXA ---------- */
  const saldoIni = num(emp.saldoInicial);
  const dataIni = emp.periodoInicio || null;
  const conta = l => l.status === 'realizado' && mesDe(l.data) && (!dataIni || l.data >= dataIni) && l.data <= hojeISO();
  let entradasAte = 0, saidasAte = 0;
  for (const l of lancs.filter(conta)) {
    const v = num(l.valor); if (v === null || v <= 0 || !CLASSES[l.classe]) continue;
    if (CLASSES[l.classe].lado === 'entrada') entradasAte += v; else saidasAte += v;
  }
  const saldoAtual = saldoIni === null ? null : saldoIni + entradasAte - saidasAte;
  const caixa = [];
  caixa.push(calculo('saldo', 'Saldo de caixa hoje',
    'Saldo inicial + Σ entradas realizadas − Σ saídas realizadas',
    [{ nome: 'Saldo inicial' + (dataIni ? ` (${dataIni})` : ''), valor: F.din(saldoIni) },
     { nome: 'Entradas realizadas no período', valor: F.din(entradasAte) },
     { nome: 'Saídas realizadas no período', valor: F.din(saidasAte) }],
    F.din(saldoAtual),
    saldoAtual === null ? 'Sem o saldo inicial não dá para saber o caixa: informe-o na aba Empresa.'
      : saldoAtual < 0 ? 'Caixa negativo pelos lançamentos: confira se falta alguma entrada ou se o saldo inicial está certo.'
      : 'Saldo calculado só com o que foi lançado como realizado.'));

  // projeção: saldo de hoje + o que já está lançado como previsto, mês a mês
  const projecao = [];
  if (saldoAtual !== null) {
    let s = saldoAtual, m = hojeISO().slice(0, 7);
    for (let i = 0; i < 6; i++) {
      const p = prev[m];
      const e = p ? p.entradas : 0, sd = p ? p.saidas : 0;
      s += e - sd;
      projecao.push({ mes: m, entradasPrevistas: e, saidasPrevistas: sd, saldoProjetado: s });
      m = mesSeguinte(m);
    }
  }
  const ultimos3 = mesesReais.filter(m => m <= mes).slice(-3);
  const queima = ultimos3.length ? soma(ultimos3.map(m => real[m].saidas - real[m].entradas)) / ultimos3.length : null;
  const folego = (saldoAtual !== null && queima !== null && queima > 0) ? saldoAtual / queima : null;
  caixa.push(calculo('folego', 'Fôlego de caixa',
    'Saldo de hoje ÷ queima média mensal (saídas − entradas, últimos meses realizados)',
    [{ nome: 'Saldo de hoje', valor: F.din(saldoAtual) },
     { nome: `Queima média (${ultimos3.length} ${ultimos3.length === 1 ? 'mês' : 'meses'})`, valor: queima === null ? NI : queima <= 0 ? `nenhuma (entrou ${F.din(-queima)}/mês a mais)` : F.din(queima) }],
    folego === null ? (queima !== null && queima <= 0 ? 'sem queima' : NI) : F.n(folego) + ' meses',
    queima !== null && queima <= 0 ? 'Nos últimos meses entrou mais do que saiu: o caixa não está sendo consumido.'
      : folego === null ? 'Faltam o saldo inicial ou meses realizados para medir.'
      : folego < 3 ? 'Menos de 3 meses de caixa no ritmo atual: atenção a entradas e cortes.'
      : 'Tempo que o caixa aguenta se o ritmo dos últimos meses continuar.'));

  /* ---------- 2) RESULTADO ---------- */
  const receita = M ? cls(M, 'receita') : null;
  const impostos = M ? cls(M, 'imposto') : null;
  const recLiq = M ? receita - impostos : null;
  const cv = M ? cls(M, 'custo_variavel') : null;
  const cf = M ? cls(M, 'custo_fixo') : null;
  const desp = M ? cls(M, 'despesa') : null;
  const mc = M ? recLiq - cv : null;
  const resOp = M ? mc - cf - desp : null;
  const resultado = [
    calculo('receita_liquida', 'Receita líquida', 'Receita − impostos sobre venda',
      [{ nome: 'Receita', valor: F.din(receita) }, { nome: 'Impostos sobre venda', valor: F.din(impostos) }],
      F.din(recLiq), temDados ? 'Base para margens e ticket.' : 'Sem lançamentos realizados no mês.'),
    calculo('resultado_operacional', 'Resultado operacional (simplificado)',
      'Receita líquida − custos variáveis − custos fixos − despesas',
      [{ nome: 'Receita líquida', valor: F.din(recLiq) }, { nome: 'Custos variáveis', valor: F.din(cv) },
       { nome: 'Custos fixos', valor: F.din(cf) }, { nome: 'Despesas', valor: F.din(desp) }],
      F.din(resOp),
      resOp === null ? 'Sem dados do mês.' : resOp < 0 ? 'O mês fechou no prejuízo operacional.' : 'O mês fechou positivo na operação.')
  ];

  /* ---------- 3) MARGEM ---------- */
  const mcPct = pct(mc, recLiq), opPct = pct(resOp, recLiq);
  const margem = [
    calculo('margem_contribuicao', 'Margem de contribuição', '(Receita líquida − custos variáveis) ÷ receita líquida',
      [{ nome: 'Receita líquida', valor: F.din(recLiq) }, { nome: 'Custos variáveis', valor: F.din(cv) }],
      mcPct === null ? NI : `${F.din(mc)} (${F.pct(mcPct)})`,
      mcPct === null ? 'Precisa de receita no mês.' : `De cada 100 que entram, ${F.n(mcPct * 100)} sobram para pagar a estrutura fixa e gerar lucro.`),
    calculo('margem_operacional', 'Margem operacional', 'Resultado operacional ÷ receita líquida',
      [{ nome: 'Resultado operacional', valor: F.din(resOp) }, { nome: 'Receita líquida', valor: F.din(recLiq) }],
      F.pct(opPct), opPct === null ? 'Precisa de receita no mês.' : 'Quanto da receita virou resultado depois de toda a operação.')
  ];

  /* ---------- 4) UNIT ECONOMICS ---------- */
  const op = ops.find(o => o.mes === mes) || {};
  const vendas = num(op.vendas), novos = num(op.clientesNovos), aquis = num(op.investimentoAquisicao);
  const ticket = (vendas && receita !== null) ? receita / vendas : null;
  const cvVenda = (vendas && cv !== null) ? cv / vendas : null;
  const margemVenda = (ticket !== null && cvVenda !== null) ? (recLiq / vendas) - cvVenda : null;
  const cac = (novos && aquis !== null) ? aquis / novos : null;
  const cpa = (vendas && aquis !== null) ? aquis / vendas : null;
  const fixos = (cf !== null && desp !== null) ? cf + desp : null;
  const peVendas = (margemVenda && margemVenda > 0 && fixos !== null) ? fixos / margemVenda : null;
  const peReceita = (mcPct && mcPct > 0 && fixos !== null) ? fixos / mcPct : null;
  const unit = [
    calculo('ticket', 'Ticket médio', 'Receita ÷ nº de vendas',
      [{ nome: 'Receita', valor: F.din(receita) }, { nome: 'Nº de vendas', valor: vendas === null ? NI : F.n(vendas) }],
      F.din(ticket), ticket === null ? 'Informe o nº de vendas do mês na aba Operação.' : 'Valor médio de cada venda/projeto.'),
    calculo('custo_venda', 'Custo variável por venda', 'Custos variáveis ÷ nº de vendas',
      [{ nome: 'Custos variáveis', valor: F.din(cv) }, { nome: 'Nº de vendas', valor: vendas === null ? NI : F.n(vendas) }],
      F.din(cvVenda), cvVenda === null ? 'Precisa do nº de vendas.' : 'Quanto cada venda consome de custo direto.'),
    calculo('margem_venda', 'Margem por venda', '(Receita líquida ÷ vendas) − custo variável por venda',
      [{ nome: 'Receita líquida', valor: F.din(recLiq) }, { nome: 'Nº de vendas', valor: vendas === null ? NI : F.n(vendas) },
       { nome: 'Custo variável por venda', valor: F.din(cvVenda) }],
      F.din(margemVenda), margemVenda === null ? 'Precisa do nº de vendas.' : 'O que cada venda deixa para a estrutura.'),
    calculo('cac', 'CAC (custo de aquisição de cliente)', 'Investimento em aquisição ÷ clientes novos',
      [{ nome: 'Investimento em aquisição', valor: F.din(aquis) }, { nome: 'Clientes novos', valor: novos === null ? NI : F.n(novos) }],
      F.din(cac), cac === null ? 'Informe investimento em marketing/comercial e clientes novos na aba Operação.'
        : (margemVenda !== null && cac > margemVenda) ? 'O CAC passa da margem de uma venda: o cliente só se paga se comprar de novo.'
        : 'Quanto custa trazer cada cliente novo.'),
    calculo('cpa', 'CPA (custo por venda)', 'Investimento em aquisição ÷ nº de vendas',
      [{ nome: 'Investimento em aquisição', valor: F.din(aquis) }, { nome: 'Nº de vendas', valor: vendas === null ? NI : F.n(vendas) }],
      F.din(cpa), cpa === null ? 'Precisa do investimento em aquisição e do nº de vendas.' : 'Custo comercial de cada venda fechada.'),
    calculo('ponto_equilibrio', 'Ponto de equilíbrio',
      'Custos fixos + despesas ÷ margem de contribuição % (em receita) | ÷ margem por venda (em vendas)',
      [{ nome: 'Custos fixos + despesas', valor: F.din(fixos) }, { nome: 'Margem de contribuição %', valor: F.pct(mcPct) },
       { nome: 'Margem por venda', valor: F.din(margemVenda) }],
      peReceita === null ? NI : `${F.din(peReceita)} de receita${peVendas !== null ? ` ≈ ${F.n(Math.ceil(peVendas))} vendas` : ''}`,
      peReceita === null ? 'Precisa de margem de contribuição positiva.'
        : receita >= peReceita ? 'A receita do mês passou do ponto de equilíbrio.' : 'A receita do mês ficou abaixo do ponto de equilíbrio.')
  ];

  /* ---------- 5) ORÇAMENTO ---------- */
  const orcMes = orc.filter(o => o.mes === mes && num(o.valor) !== null);
  const orcamento = orcMes.map(o => {
    const chave = `${o.classe}::${(o.categoria || 'sem categoria').trim()}`;
    const realizado = M ? (M.categorias[chave] || 0) : 0;
    const planejado = num(o.valor);
    const desvio = realizado - planejado;
    const lado = CLASSES[o.classe] ? CLASSES[o.classe].lado : 'saida';
    const ruim = lado === 'entrada' ? desvio < 0 : desvio > 0;
    return { categoria: o.categoria, classe: o.classe, planejado, realizado, desvio, desvioPct: pct(desvio, planejado), ruim,
             f: { planejado: F.din(planejado), realizado: F.din(realizado), desvio: F.din(desvio), desvioPct: F.pct(pct(desvio, planejado)) } };
  });

  /* ---------- 6) ALERTAS ---------- */
  const alertas = [];
  const recAnt = A ? cls(A, 'receita') : null;
  if (receita !== null && recAnt) {
    const v = pct(receita - recAnt, recAnt);
    if (v <= -0.1) alertas.push({ nivel: 'alto', tipo: 'receita', texto: `Receita caiu ${F.pct(-v)} em relação a ${ant} (${F.din(recAnt)} → ${F.din(receita)}).` });
  }
  if (M) {
    const anteriores = mesesReais.filter(m => m < mes).slice(-3);
    for (const [chave, v] of Object.entries(M.categorias)) {
      const [classe, cat] = chave.split('::');
      if (CLASSES[classe].lado !== 'saida' || !anteriores.length) continue;
      const media = soma(anteriores.map(m => real[m].categorias[chave] || 0)) / anteriores.length;
      if (media > 0 && v > media * 1.2 && v - media > 0) alertas.push({ nivel: 'medio', tipo: 'custo',
        texto: `${cat} (${CLASSES[classe].nome.toLowerCase()}) subiu ${F.pct(pct(v - media, media))} sobre a média dos ${anteriores.length} meses anteriores (${F.din(media)} → ${F.din(v)}).` });
    }
  }
  // valor fora do padrão da própria categoria
  const porCat = {};
  for (const l of lancs) {
    const v = num(l.valor); if (v === null || v <= 0) continue;
    (porCat[`${l.classe}::${l.categoria}`] = porCat[`${l.classe}::${l.categoria}`] || []).push(v);
  }
  for (const l of lancs.filter(l => mesDe(l.data) === mes)) {
    const arr = porCat[`${l.classe}::${l.categoria}`] || [];
    const md = mediana(arr), v = num(l.valor);
    if (arr.length >= 4 && md && v > md * 3)
      alertas.push({ nivel: 'medio', tipo: 'fora_do_padrao', texto: `"${l.descricao}" (${F.din(v)}) está mais de 3× acima do valor típico de ${l.categoria} (${F.din(md)}).` });
  }
  for (const o of orcamento) if (o.ruim && Math.abs(o.desvioPct || 0) > 0.1)
    alertas.push({ nivel: 'medio', tipo: 'orcamento', texto: `${o.categoria}: ${o.f.desvioPct} fora do orçado (${o.f.planejado} planejado, ${o.f.realizado} realizado).` });
  if (resOp !== null && resOp < 0) alertas.push({ nivel: 'alto', tipo: 'resultado', texto: `Resultado operacional negativo no mês: ${F.din(resOp)}.` });
  const minimo = num(emp.caixaMinimo);
  const furo = projecao.find(p => p.saldoProjetado < (minimo !== null ? minimo : 0));
  if (furo) alertas.push({ nivel: 'alto', tipo: 'caixa', texto: `Caixa projetado em ${furo.mes} (${F.din(furo.saldoProjetado)}) fica abaixo do ${minimo !== null ? 'caixa mínimo de ' + F.din(minimo) : 'zero'}, só com o que está previsto.` });
  const incons = inconsistencias(lancs);
  for (const i of incons.slice(0, 12)) alertas.push({ nivel: 'dado', tipo: 'inconsistencia', texto: i.texto });

  /* ---------- 7) CENÁRIOS ---------- */
  const H = Object.assign({ meses: 6,
    conservador: { receita: -10, custos: 5 }, base: { receita: 0, custos: 0 }, agressivo: { receita: 10, custos: 5 } },
    dados.cenarios || {});
  const baseMeses = mesesReais.filter(m => m <= mes).slice(-3);
  let cenarios = null;
  if (baseMeses.length) {
    const media = k => soma(baseMeses.map(m => cls(real[m], k))) / baseMeses.length;
    const b = { receita: media('receita'), imposto: media('imposto'), cv: media('custo_variavel'),
                cf: media('custo_fixo'), desp: media('despesa') };
    const pctImp = pct(b.imposto, b.receita) || 0, pctCv = pct(b.cv, b.receita) || 0;
    const roda = (h) => {
      const rec = b.receita * (1 + (num(h.receita) || 0) / 100);
      const fixos = (b.cf + b.desp) * (1 + (num(h.custos) || 0) / 100);
      const res = rec * (1 - pctImp - pctCv) - fixos;
      const meses = num(H.meses) || 6;
      return { receitaMensal: rec, resultadoMensal: res, acumulado: res * meses,
               caixaFinal: saldoAtual === null ? null : saldoAtual + res * meses };
    };
    cenarios = {
      meses: num(H.meses) || 6,
      fato: [`Média de ${baseMeses.join(', ')} (realizado):`,
             `receita ${F.din(b.receita)}/mês, impostos ${F.pct(pctImp)} da receita, custos variáveis ${F.pct(pctCv)} da receita, custos fixos + despesas ${F.din(b.cf + b.desp)}/mês.`,
             `Saldo de caixa hoje: ${F.din(saldoAtual)}.`],
      lista: ['conservador', 'base', 'agressivo'].map(k => {
        const h = H[k] || {}, r = roda(h);
        return { nome: k, hipotese: `receita ${num(h.receita) >= 0 ? '+' : ''}${num(h.receita) || 0}% e custos fixos ${num(h.custos) >= 0 ? '+' : ''}${num(h.custos) || 0}% sobre a média; impostos e custos variáveis mantêm a mesma proporção da receita.`,
                 hReceita: num(h.receita) || 0, hCustos: num(h.custos) || 0,
                 calculo: `Resultado/mês = receita × (1 − ${F.pct(pctImp)} − ${F.pct(pctCv)}) − fixos; caixa final = saldo de hoje + resultado × ${num(H.meses) || 6} meses`,
                 f: { receita: F.din(r.receitaMensal), resultado: F.din(r.resultadoMensal), acumulado: F.din(r.acumulado), caixa: F.din(r.caixaFinal) } };
      })
    };
  }

  /* ---------- 8) PAINEL — poucos KPIs que mudam decisão ---------- */
  const metaRec = num(emp.metaReceita), metaMg = num(emp.metaMargem);
  const desvioOrc = orcamento.length ? soma(orcamento.filter(o => CLASSES[o.classe] && CLASSES[o.classe].lado === 'saida').map(o => o.desvio)) : null;
  const painel = [
    { kpi: 'Saldo de caixa', valor: F.din(saldoAtual), sinal: saldoAtual === null ? 'nd' : (minimo !== null && saldoAtual < minimo) || saldoAtual < 0 ? 'ruim' : 'ok' },
    { kpi: 'Fôlego de caixa', valor: folego === null ? (queima !== null && queima <= 0 ? 'sem queima' : NI) : F.n(folego) + ' meses', sinal: folego === null ? (queima !== null && queima <= 0 ? 'ok' : 'nd') : folego < 3 ? 'ruim' : 'ok' },
    { kpi: `Resultado operacional (${mes})`, valor: F.din(resOp), sinal: resOp === null ? 'nd' : resOp < 0 ? 'ruim' : 'ok' },
    { kpi: 'Margem de contribuição', valor: F.pct(mcPct), sinal: mcPct === null ? 'nd' : metaMg !== null && mcPct * 100 < metaMg ? 'ruim' : 'ok', meta: metaMg !== null ? `meta ${metaMg}%` : null },
    { kpi: 'Receita x meta', valor: metaRec !== null && receita !== null ? F.pct(receita / metaRec) : NI, sinal: metaRec === null || receita === null ? 'nd' : receita >= metaRec ? 'ok' : 'ruim', meta: metaRec !== null ? `meta ${F.din(metaRec)}` : null },
    { kpi: 'Custos x orçamento', valor: desvioOrc === null ? NI : F.din(desvioOrc), sinal: desvioOrc === null ? 'nd' : desvioOrc > 0 ? 'ruim' : 'ok' }
  ];

  /* ---------- o que mudou e por quê (só com base nos lançamentos) ---------- */
  const mudancas = [];
  const causas = [];
  if (M && A) {
    const linhas = [['Receita', receita, recAnt], ['Custos variáveis', cv, cls(A, 'custo_variavel')],
                    ['Custos fixos', cf, cls(A, 'custo_fixo')], ['Despesas', desp, cls(A, 'despesa')],
                    ['Resultado operacional', resOp, (cls(A, 'receita') - cls(A, 'imposto') - cls(A, 'custo_variavel') - cls(A, 'custo_fixo') - cls(A, 'despesa'))]];
    for (const [n, a, b] of linhas) {
      if (a === null || b === null || a === b) continue;
      mudancas.push(`${n}: ${F.din(b)} → ${F.din(a)} (${b ? (a > b ? '+' : '') + F.pct(pct(a - b, Math.abs(b))) : 'novo'})`);
    }
    const difs = [];
    const chaves = new Set([...Object.keys(M.categorias), ...Object.keys(A.categorias)]);
    for (const k of chaves) difs.push({ k, d: (M.categorias[k] || 0) - (A.categorias[k] || 0) });
    difs.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    for (const { k, d } of difs.slice(0, 3)) {
      if (!d) continue;
      const [classe, cat] = k.split('::');
      causas.push(`${cat} (${CLASSES[classe] ? CLASSES[classe].nome.toLowerCase() : classe}) ${d > 0 ? 'aumentou' : 'diminuiu'} ${F.din(Math.abs(d))} — uma das maiores variações entre ${ant} e ${mes}.`);
    }
  }

  /* ---------- ações, sempre ligadas a um alerta ou a um dado faltante ---------- */
  const acoes = [];
  if (alertas.some(a => a.tipo === 'caixa')) acoes.push('Rever as saídas previstas e antecipar recebimentos antes do mês em que o caixa fica abaixo do mínimo.');
  if (alertas.some(a => a.tipo === 'receita')) acoes.push('Levantar quais clientes/projetos deixaram de faturar e o que está no funil para o próximo mês.');
  if (alertas.some(a => a.tipo === 'custo')) acoes.push('Abrir os lançamentos das categorias que subiram e separar o que é pontual do que virou recorrente.');
  if (alertas.some(a => a.tipo === 'orcamento')) acoes.push('Decidir, categoria a categoria, se o orçamento estava errado ou se o gasto precisa ser contido.');
  if (alertas.some(a => a.tipo === 'resultado')) acoes.push('Comparar a margem de contribuição com a estrutura fixa: ou a receita sobe até o ponto de equilíbrio, ou o fixo precisa cair.');
  if (incons.length) acoes.push(`Corrigir ${incons.length} lançamento(s) com dado inconsistente antes de tomar decisão com estes números.`);
  if (!acoes.length && temDados) acoes.push('Sem alertas no mês: manter o registro em dia e acompanhar o painel na próxima revisão.');

  const faltantes = [
    ...faltaOnboarding(emp).map(f => f.pergunta),
    ...(temDados ? [] : [`Lançamentos realizados de ${mes}`]),
    ...(vendas === null ? [`Nº de vendas de ${mes} (aba Operação)`] : []),
    ...(novos === null || aquis === null ? [`Clientes novos e investimento em aquisição de ${mes}`] : []),
    ...(orcMes.length ? [] : [`Orçamento de ${mes}`])
  ];

  return {
    mes, mesAnterior: ant, mesesDisponiveis: [...new Set([...mesesReais, ...Object.keys(prev)])].sort(),
    moeda: emp.moeda || null, temDados, onboarding: faltaOnboarding(emp),
    caixa: { calculos: caixa, projecao: projecao.map(p => Object.assign(p, { f: { e: F.din(p.entradasPrevistas), s: F.din(p.saidasPrevistas), saldo: F.din(p.saldoProjetado) } })),
             historico: mesesReais.map(m => ({ mes: m, f: { e: F.din(real[m].entradas), s: F.din(real[m].saidas), liq: F.din(real[m].entradas - real[m].saidas) } })) },
    resultado, margem, unit, orcamento, alertas, cenarios, painel, mudancas, causas, acoes, faltantes,
    inconsistencias: incons
  };
}

/* ===========================================================
   RELATÓRIO NO FORMATO PADRÃO (texto)
   =========================================================== */
function relatorio(dados, mes) {
  const a = analisar(dados, mes);
  const nome = (dados.empresa && dados.empresa.nome) || 'a empresa';
  const L = [];
  const prox = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const caixa = a.caixa.calculos[0], res = a.resultado[1], mc = a.margem[0];

  L.push(`# Financeiro & Performance — ${nome} — ${a.mes}`, '');
  L.push('> Agente de gestão, não contador, auditor, advogado ou consultor de investimentos. Obrigações fiscais, contábeis e jurídicas precisam de validação profissional.', '');
  L.push('## Resumo executivo');
  if (!a.temDados) L.push(`Ainda não há lançamentos realizados em ${a.mes}. O painel fica completo quando os dados faltantes abaixo forem informados.`);
  else L.push(`Caixa de hoje: ${caixa.resultado}. Resultado operacional de ${a.mes}: ${res.resultado}. Margem de contribuição: ${mc.resultado}. ` +
              `${a.alertas.filter(x => x.nivel === 'alto').length} alerta(s) alto(s), ${a.alertas.filter(x => x.nivel === 'medio').length} médio(s).`);
  L.push('', '## Números-chave');
  for (const p of a.painel) L.push(`- **${p.kpi}:** ${p.valor}${p.meta ? ` (${p.meta})` : ''}`);
  L.push('', '### Como cada número foi calculado');
  for (const c of [...a.caixa.calculos, ...a.resultado, ...a.margem, ...a.unit]) {
    L.push(`- **${c.titulo}** = ${c.resultado}`);
    L.push(`  - Fórmula: ${c.formula}`);
    L.push(`  - Entradas: ${c.entradas.map(e => `${e.nome}: ${e.valor}`).join('; ')}`);
    L.push(`  - Leitura: ${c.interpretacao}`);
  }
  L.push('', `## O que mudou (${a.mesAnterior} → ${a.mes})`);
  L.push(...(a.mudancas.length ? a.mudancas.map(x => '- ' + x) : ['- Sem mês anterior para comparar.']));
  L.push('', '## Possíveis causas');
  L.push(...(a.causas.length ? a.causas.map(x => '- ' + x) : ['- Sem variação suficiente para apontar causa.']));
  if (a.alertas.length) { L.push('', '### Alertas'); L.push(...a.alertas.map(x => `- [${x.nivel}] ${x.texto}`)); }
  L.push('', '## Ações recomendadas');
  L.push(...(a.acoes.length ? a.acoes.map(x => '- ' + x) : ['- Informar os dados faltantes.']));
  if (a.cenarios) {
    L.push('', `## Cenários (${a.cenarios.meses} meses)`);
    L.push('**FATO:** ' + a.cenarios.fato.join(' '));
    for (const c of a.cenarios.lista) {
      L.push(`- **${c.nome.toUpperCase()}** — HIPÓTESE: ${c.hipotese}`);
      L.push(`  - CÁLCULO: ${c.calculo} → receita ${c.f.receita}/mês, resultado ${c.f.resultado}/mês, acumulado ${c.f.acumulado}, caixa final ${c.f.caixa}`);
    }
  }
  L.push('', '## Dados faltantes');
  L.push(...(a.faltantes.length ? a.faltantes.map(x => '- ' + x) : ['- Nenhum.']));
  L.push('', '## Próxima revisão', `- ${prox} (ou no fechamento de ${a.mes}).`);
  return L.join('\n');
}

module.exports = { analisar, relatorio, inconsistencias, faltaOnboarding, PERGUNTAS, CLASSES, NI };
