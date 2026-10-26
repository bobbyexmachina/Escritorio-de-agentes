/* ===========================================================
   regras.js — o sistema operacional da Maya Albuquerque (Operações)

   Diagnóstico -> priorização -> plano -> processos -> rotina ->
   revisão -> documentação. Tudo com a mesma regra: nada de número,
   prazo ou fato inventado; cada item diz se é FATO fornecido,
   HIPÓTESE ou RECOMENDAÇÃO; o que falta aparece como "não informado".

   Usado pelo servidor (painel) e pelo relatorio.js (linha de comando).
   =========================================================== */
'use strict';

const NI = 'não informado';
const NATUREZAS = ['fato', 'hipotese', 'recomendacao'];
const ROTULO_NAT = { fato: 'FATO', hipotese: 'HIPÓTESE', recomendacao: 'RECOMENDAÇÃO' };
const STATUS = ['a fazer', 'em andamento', 'bloqueada', 'feita'];

/* onboarding: o Mapa da Operação */
const PERGUNTAS = [
  ['nome', 'Nome da empresa'],
  ['nicho', 'Nicho'],
  ['oferta', 'Oferta / produto principal'],
  ['publico', 'Público'],
  ['tamanho', 'Tamanho da operação (faturamento, projetos/mês ou volume)'],
  ['equipe', 'Equipe disponível (quem faz o quê)'],
  ['canais', 'Principais canais (venda e entrega)'],
  ['ferramentas', 'Ferramentas usadas'],
  ['objetivo', 'Objetivo atual'],
  ['gargalo', 'Maior gargalo hoje']
];

const hojeISO = () => new Date().toISOString().slice(0, 10);
const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const nota = v => { const n = Number(v); return [1, 2, 3].includes(n) ? n : null; };
const preenchido = v => String(v == null ? '' : v).trim() !== '';

function faltaOnboarding(emp) {
  emp = emp || {};
  return PERGUNTAS.filter(([k]) => !preenchido(emp[k])).map(([campo, pergunta]) => ({ campo, pergunta }));
}

/* ===========================================================
   PRIORIZAÇÃO — impacto, urgência, esforço (1 baixo · 2 médio · 3 alto)
   e dependência. A fórmula fica à mostra.
   =========================================================== */
const FORMULA = 'Pontuação = (impacto × 2 + urgência) ÷ esforço';
function prioridade(a) {
  const i = nota(a.impacto), u = nota(a.urgencia), e = nota(a.esforco);
  if (i === null || u === null || e === null) return { pontos: null, quadrante: 'sem classificação', falta: [!i && 'impacto', !u && 'urgência', !e && 'esforço'].filter(Boolean) };
  const pontos = Math.round(((i * 2 + u) / e) * 100) / 100;
  const quadrante = i >= 2 && e <= 2 ? 'fazer já' : i >= 2 ? 'projeto' : e <= 1 ? 'ajuste rápido' : 'adiar';
  return { pontos, quadrante, falta: [] };
}

/** a ação está travada por outra que ainda não foi feita? */
function bloqueio(a, porId) {
  return (a.dependeDe || []).map(id => porId.get(id)).filter(d => d && d.status !== 'feita');
}

/* ===========================================================
   ANÁLISE COMPLETA
   =========================================================== */
function analisar(dados) {
  const emp = dados.empresa || {};
  const acoes = Array.isArray(dados.acoes) ? dados.acoes : [];
  const diag = dados.diagnostico || {};
  const hoje = hojeISO();
  const porId = new Map(acoes.map(a => [a.id, a]));

  const lista = acoes.map(a => {
    const p = prioridade(a);
    const trava = bloqueio(a, porId);
    const incompleta = [!preenchido(a.responsavel) && 'responsável', !preenchido(a.prazo) && 'prazo',
                        !preenchido(a.criterio) && 'critério de conclusão', !preenchido(a.metrica) && 'métrica'].filter(Boolean);
    const atrasada = a.status !== 'feita' && preenchido(a.prazo) && a.prazo < hoje;
    const feitaComAtraso = a.status === 'feita' && preenchido(a.prazo) && preenchido(a.concluidaEm) && a.concluidaEm > a.prazo;
    return Object.assign({}, a, { prioridade: p, travadaPor: trava.map(t => t.titulo), incompleta, atrasada, feitaComAtraso });
  });
  const abertas = lista.filter(a => a.status !== 'feita');
  const ordenadas = [...abertas].sort((x, y) =>
    (x.travadaPor.length - y.travadaPor.length) || ((y.prioridade.pontos ?? -1) - (x.prioridade.pontos ?? -1)) || String(x.prazo || '9').localeCompare(String(y.prazo || '9')));
  const top3 = ordenadas.filter(a => !a.travadaPor.length && a.prioridade.pontos !== null).slice(0, 3);

  /* ---------- revisão: planejado x realizado ---------- */
  const feitas = lista.filter(a => a.status === 'feita');
  const comPrazoVencido = lista.filter(a => preenchido(a.prazo) && a.prazo <= hoje);
  const noPrazo = comPrazoVencido.filter(a => a.status === 'feita' && !a.feitaComAtraso).length;
  const revisao = {
    total: lista.length, feitas: feitas.length, abertas: abertas.length,
    atrasadas: lista.filter(a => a.atrasada), feitasComAtraso: lista.filter(a => a.feitaComAtraso),
    bloqueadas: lista.filter(a => a.status !== 'feita' && (a.travadaPor.length || a.status === 'bloqueada')),
    incompletas: abertas.filter(a => a.incompleta.length), semClassificacao: abertas.filter(a => a.prioridade.pontos === null),
    cumprimento: comPrazoVencido.length ? noPrazo / comPrazoVencido.length : null,
    formulaCumprimento: 'Cumprimento = ações feitas no prazo ÷ ações com prazo até hoje'
  };
  const correcoes = [];
  for (const a of revisao.atrasadas)
    correcoes.push(`"${a.titulo}" venceu em ${a.prazo}${a.responsavel ? ` (${a.responsavel})` : ''}: confirmar se ainda vale, renegociar o prazo com o responsável ou cortar o escopo.`);
  for (const a of revisao.bloqueadas.filter(b => b.travadaPor.length))
    correcoes.push(`"${a.titulo}" depende de ${a.travadaPor.map(t => `"${t}"`).join(', ')}: priorizar a dependência ou reordenar.`);
  if (revisao.incompletas.length) correcoes.push(`${revisao.incompletas.length} ação(ões) sem responsável, prazo, critério ou métrica: completar antes de cobrar execução.`);
  if (abertas.length > 7) correcoes.push(`${abertas.length} ações abertas ao mesmo tempo: concentrar nas 3 prioridades e pausar o resto.`);

  /* ---------- alertas ---------- */
  const alertas = [];
  if (revisao.atrasadas.length) alertas.push({ nivel: 'alto', texto: `${revisao.atrasadas.length} ação(ões) atrasada(s).` });
  if (revisao.bloqueadas.length) alertas.push({ nivel: 'medio', texto: `${revisao.bloqueadas.length} ação(ões) bloqueada(s).` });
  if (revisao.incompletas.length) alertas.push({ nivel: 'medio', texto: `${revisao.incompletas.length} ação(ões) sem responsável, prazo, critério de conclusão ou métrica.` });
  if (revisao.semClassificacao.length) alertas.push({ nivel: 'dado', texto: `${revisao.semClassificacao.length} ação(ões) sem impacto, urgência ou esforço: não entram na priorização.` });
  const sopsVelhos = (dados.sops || []).filter(s => s.revisadoEm && s.revisadoEm < somaDias(hoje, -90));
  if (sopsVelhos.length) alertas.push({ nivel: 'dado', texto: `${sopsVelhos.length} SOP(s) sem revisão há mais de 90 dias.` });

  /* ---------- documentação: resumo executivo ---------- */
  const decisoes = (dados.decisoes || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const proximo = top3[0] ? `${top3[0].titulo}${top3[0].responsavel ? ` — ${top3[0].responsavel}` : ''}${top3[0].prazo ? ` até ${top3[0].prazo}` : ''}` : NI;

  return {
    hoje, onboarding: faltaOnboarding(emp), formula: FORMULA,
    diagnostico: {
      objetivo: diag.objetivo || emp.objetivo || '', situacao: diag.situacao || '',
      itens: (diag.itens || []).map(i => Object.assign({ rotulo: ROTULO_NAT[i.natureza] || 'FATO' }, i))
    },
    acoes: lista, ordenadas, top3, revisao, correcoes, alertas, decisoes,
    pendencias: abertas.filter(a => a.status !== 'feita').slice(0, 20).map(a => a.titulo),
    proximoPasso: proximo,
    contagem: { sops: (dados.sops || []).length, rotinas: (dados.rotinas || []).length, decisoes: decisoes.length }
  };
}

/* ===========================================================
   ENTREGA NO FORMATO PADRÃO
   Objetivo; Situação atual; 3 prioridades; Plano de ação; Responsável
   sugerido; Prazo; Métrica; Riscos; Próximo passo.
   =========================================================== */
function entrega(dados) {
  const a = analisar(dados);
  const emp = dados.empresa || {};
  const v = s => preenchido(s) ? s : NI;
  const riscos = a.diagnostico.itens.filter(i => i.tipo === 'risco');
  const L = [`# Operação — ${emp.nome || 'a empresa'} — ${a.hoje}`, ''];
  if (a.onboarding.length) { L.push('> Mapa da Operação incompleto. Falta: ' + a.onboarding.map(o => o.pergunta.toLowerCase()).join('; ') + '.', ''); }
  L.push('## Objetivo', v(a.diagnostico.objetivo), '');
  L.push('## Situação atual', v(a.diagnostico.situacao));
  const gargalos = a.diagnostico.itens.filter(i => i.tipo === 'gargalo');
  if (gargalos.length) L.push(...gargalos.map(g => `- [${g.rotulo}] Gargalo: ${g.texto}`));
  L.push('', '## 3 prioridades');
  L.push(...(a.top3.length ? a.top3.map((p, i) => `${i + 1}. ${p.titulo} — ${p.prioridade.quadrante}, pontuação ${p.prioridade.pontos}`) : ['- Nenhuma ação classificada ainda.']));
  L.push('', `_${a.formula} (notas de 1 a 3). Ações travadas por dependência ficam de fora._`, '');
  L.push('## Plano de ação', '');
  L.push('| Ação | Responsável sugerido | Prazo | Critério de conclusão | Métrica | Status |', '| --- | --- | --- | --- | --- | --- |');
  for (const x of a.ordenadas) L.push(`| ${x.titulo} | ${v(x.responsavel)} | ${v(x.prazo)} | ${v(x.criterio)} | ${v(x.metrica)} | ${x.status}${x.atrasada ? ' (atrasada)' : ''}${x.travadaPor.length ? ' (bloqueada)' : ''} |`);
  if (!a.ordenadas.length) L.push('| — | — | — | — | — | — |');
  L.push('', '## Responsável sugerido');
  const resp = [...new Set(a.top3.map(p => p.responsavel).filter(preenchido))];
  L.push(resp.length ? resp.join(', ') : NI);
  L.push('', '## Prazo', a.top3.length ? a.top3.map(p => `${p.titulo}: ${v(p.prazo)}`).join(' · ') : NI);
  L.push('', '## Métrica', a.top3.length ? a.top3.map(p => `${p.titulo}: ${v(p.metrica)}`).join(' · ') : NI);
  L.push('', '## Riscos');
  L.push(...(riscos.length ? riscos.map(r => `- [${r.rotulo}] ${r.texto}`) : ['- Nenhum risco registrado no diagnóstico.']));
  L.push('', '## Próximo passo', a.proximoPasso);
  if (a.correcoes.length) { L.push('', '## Correções sugeridas (revisão)'); L.push(...a.correcoes.map(c => '- [RECOMENDAÇÃO] ' + c)); }
  return L.join('\n');
}

/* resumo executivo: decidido, pendências, próximos passos */
function resumoExecutivo(dados) {
  const a = analisar(dados);
  const L = [`# Resumo executivo — ${a.hoje}`, '', '## Decidido'];
  L.push(...(a.decisoes.length ? a.decisoes.slice(0, 15).map(d => `- ${d.data}: ${d.texto} [${ROTULO_NAT[d.natureza] || 'FATO'}]`) : ['- Nenhuma decisão registrada.']));
  L.push('', '## Pendências');
  L.push(...(a.pendencias.length ? a.pendencias.map(p => '- ' + p) : ['- Nenhuma.']));
  L.push('', '## Próximos passos');
  L.push(...(a.top3.length ? a.top3.map(p => `- ${p.titulo}${p.responsavel ? ` — ${p.responsavel}` : ''}${p.prazo ? ` até ${p.prazo}` : ''}`) : ['- Classificar as ações para definir os próximos passos.']));
  if (a.alertas.length) { L.push('', '## Alertas'); L.push(...a.alertas.map(x => `- [${x.nivel}] ${x.texto}`)); }
  return L.join('\n');
}

/* um SOP como checklist pronto para copiar */
function sopTexto(s) {
  const v = x => preenchido(x) ? x : NI;
  return [`# SOP — ${s.titulo}`, '', `**Objetivo:** ${v(s.objetivo)}`, `**Quando:** ${v(s.gatilho)}`, `**Responsável:** ${v(s.responsavel)}`, '',
    '## Passos', ...(s.passos || []).filter(preenchido).map(p => `- [ ] ${p}`), '',
    `**Pronto quando:** ${v(s.pronto)}`, s.revisadoEm ? `_Revisado em ${s.revisadoEm}._` : ''].join('\n');
}

module.exports = { analisar, entrega, resumoExecutivo, sopTexto, prioridade, faltaOnboarding,
                   PERGUNTAS, NATUREZAS, ROTULO_NAT, STATUS, FORMULA, NI };
