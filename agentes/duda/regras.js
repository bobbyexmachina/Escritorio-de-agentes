/* ===========================================================
   regras.js — o sistema de marketing da Duda (Marketing & Conteúdo)

   Posicionamento -> pilares -> funil -> criativos -> copy -> conteúdo
   -> testes -> aprendizado. Regras que valem para tudo:
   - nada de depoimento, número, avaliação ou resultado inventado;
   - nenhuma promessa de ganho garantido;
   - alegação sensível vira alerta para o usuário confirmar;
   - tendência é OBSERVAÇÃO até virar FATO com resultado real.

   Usado pelo servidor (painel) e pelo relatorio.js (linha de comando).
   =========================================================== */
'use strict';

const NI = 'não informado';
const preenchido = v => String(v == null ? '' : v).trim() !== '';
const hojeISO = () => new Date().toISOString().slice(0, 10);
const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

/* onboarding: o Mapa de Comunicação */
const PERGUNTAS = [
  ['nicho', 'Empresa / nicho'],
  ['produto', 'Produto ou serviço'],
  ['publico', 'Público'],
  ['problema', 'Problema que resolve'],
  ['diferenciais', 'Diferenciais verdadeiros'],
  ['ticket', 'Ticket'],
  ['canais', 'Canais atuais'],
  ['tom', 'Tom de voz'],
  ['objetivo', 'Objetivo da campanha'],
  ['restricoes', 'Restrições legais / comerciais'],
  ['exemplos', 'Exemplos de comunicação aprovados']
];
function faltaOnboarding(emp) {
  emp = emp || {};
  return PERGUNTAS.filter(([k]) => !preenchido(emp[k])).map(([campo, pergunta]) => ({ campo, pergunta }));
}

const ETAPAS = [['descoberta', 'Descoberta'], ['consideracao', 'Consideração'], ['prova', 'Prova'], ['conversao', 'Conversão']];
const ANGULOS = [
  ['dor', 'Dor'], ['desejo', 'Desejo'], ['demonstracao', 'Demonstração'], ['comparacao', 'Comparação'],
  ['quebra', 'Quebra de padrão'], ['objecao', 'Objeção'], ['bastidor', 'Bastidor'], ['prova', 'Prova real']
];
const NATUREZAS = { fato: 'FATO (resultado real)', observacao: 'OBSERVAÇÃO', hipotese: 'HIPÓTESE' };

/* ===========================================================
   CONFERÊNCIA DE ALEGAÇÕES
   Não decide nada sozinha: aponta o trecho para o usuário confirmar.
   =========================================================== */
const SINAIS = [
  [/garanti[dt]/i, 'promessa de garantia: não prometa ganho garantido'],
  [/\b100\s?%|sem risco|infal[ií]vel|certeza absoluta/i, 'promessa absoluta: reescreva com linguagem prudente'],
  [/\bo melhor\b|\bn[ºo°]\s?1\b|l[ií]der (do|de) mercado/i, 'superlativo comparativo: só com fonte que comprove'],
  [/\d+\s?%|R\$\s?\d|\d+\s?(mil|milh[õo]es|clientes|projetos|anos|x mais)/i, 'número: confirmar a fonte antes de publicar'],
  [/depoimento|cliente (disse|falou|contou)|avalia[çc][ãa]o|estrelas|["“].{8,}["”]/i, 'depoimento ou avaliação: só se for real e autorizado'],
  [/tend[êe]ncia|viral|todo mundo est[áa]/i, 'tendência: deixe claro que é observação, não fato comprovado']
];
function conferir(texto) {
  const t = String(texto || '');
  return SINAIS.filter(([re]) => re.test(t)).map(([, motivo]) => motivo);
}
const textoDe = (o, campos) => campos.map(c => o[c]).filter(Boolean).join(' \n ');

/* ===========================================================
   PADRÕES
   =========================================================== */
/** anúncio: hook 1-3s, prova/demonstração, benefício, objeção, CTA;
    imagem: uma ideia principal, pouco texto, hierarquia clara */
function checarCriativo(c) {
  const falta = [];
  if (c.formato === 'imagem') {
    if (!preenchido(c.ideia)) falta.push('uma ideia principal');
    if (!preenchido(c.hierarquia)) falta.push('hierarquia (o que se lê primeiro)');
    const palavras = String(c.textoImagem || '').trim().split(/\s+/).filter(Boolean).length;
    if (palavras > 12) falta.push(`menos texto na imagem (${palavras} palavras; o ideal é até 12)`);
    if (!preenchido(c.cta)) falta.push('CTA');
  } else {
    if (!preenchido(c.hook)) falta.push('hook de 1 a 3 segundos');
    if (!preenchido(c.prova)) falta.push('prova ou demonstração');
    if (!preenchido(c.beneficio)) falta.push('benefício específico');
    if (!preenchido(c.objecao)) falta.push('redução de objeção');
    if (!preenchido(c.cta)) falta.push('CTA');
  }
  return falta;
}
/** conteúdo: objetivo; público; formato; gancho; roteiro/copy; CTA; visual */
const CAMPOS_CONTEUDO = [['objetivo', 'objetivo'], ['publico', 'público'], ['formato', 'formato'], ['gancho', 'gancho'],
                         ['roteiro', 'roteiro/copy'], ['cta', 'CTA'], ['visual', 'material visual']];
const checarConteudo = c => CAMPOS_CONTEUDO.filter(([k]) => !preenchido(c[k])).map(([, n]) => n);

/* ===========================================================
   ANÁLISE
   =========================================================== */
function analisar(dados) {
  const emp = dados.empresa || {};
  const pos = dados.posicionamento || {};
  const pilares = dados.pilares || [];
  const criativos = (dados.criativos || []).map(c => Object.assign({}, c, {
    falta: checarCriativo(c), alertas: conferir(textoDe(c, ['hook', 'prova', 'beneficio', 'objecao', 'cta', 'ideia', 'textoImagem', 'legenda']))
  }));
  const conteudos = (dados.conteudos || []).map(c => Object.assign({}, c, {
    falta: checarConteudo(c), alertas: conferir(textoDe(c, ['gancho', 'roteiro', 'cta', 'assunto']))
  })).sort((a, b) => String(a.data || '9').localeCompare(String(b.data || '9')));
  const copys = (dados.copys || []).map(c => Object.assign({}, c, { alertas: conferir(c.texto) }));
  const testes = dados.testes || [];
  const hoje = hojeISO();

  // cobertura de ângulos e de funil
  const angulos = ANGULOS.map(([k, n]) => ({ angulo: k, nome: n, qtd: criativos.filter(c => c.angulo === k).length }));
  const funil = ETAPAS.map(([k, n]) => ({ etapa: k, nome: n,
    conteudos: conteudos.filter(c => c.etapa === k).length, criativos: criativos.filter(c => c.etapa === k).length }));
  const usoPilar = pilares.map(p => ({ id: p.id, nome: p.nome, conteudos: conteudos.filter(c => c.pilar === p.id).length }));

  const alertas = [];
  const faltaPos = [['propostaValor', 'proposta de valor'], ['publico', 'público'], ['problema', 'problema'], ['mecanismo', 'mecanismo'], ['diferenciais', 'diferenciais']]
    .filter(([k]) => !preenchido(pos[k])).map(([, n]) => n);
  if (faltaPos.length) alertas.push({ nivel: 'medio', texto: `Posicionamento incompleto: falta ${faltaPos.join(', ')}.` });
  if (pilares.length && (pilares.length < 3 || pilares.length > 6)) alertas.push({ nivel: 'medio', texto: `${pilares.length} pilar(es): o recomendado é de 3 a 6.` });
  const sensiveis = [...criativos, ...conteudos, ...copys].filter(x => x.alertas.length);
  if (sensiveis.length) alertas.push({ nivel: 'alto', texto: `${sensiveis.length} peça(s) com alegação para confirmar antes de publicar (número, garantia, depoimento, superlativo ou tendência).` });
  const semObjetivo = conteudos.filter(c => !preenchido(c.objetivo));
  if (semObjetivo.length) alertas.push({ nivel: 'medio', texto: `${semObjetivo.length} conteúdo(s) sem objetivo: não produza só para preencher calendário.` });
  const angUsados = angulos.filter(a => a.qtd).length;
  if (criativos.length >= 4 && angUsados <= 2) alertas.push({ nivel: 'medio', texto: `${criativos.length} criativos em só ${angUsados} ângulo(s): teste ângulos realmente diferentes.` });
  const vazias = funil.filter(f => !f.conteudos && !f.criativos);
  if ((conteudos.length + criativos.length) >= 4 && vazias.length) alertas.push({ nivel: 'dado', texto: `Funil sem peças em: ${vazias.map(v => v.nome.toLowerCase()).join(', ')}.` });
  const testesSemDecisao = testes.filter(t => t.status === 'concluido' && !preenchido(t.decisao));
  if (testesSemDecisao.length) alertas.push({ nivel: 'medio', texto: `${testesSemDecisao.length} teste(s) concluído(s) sem próxima decisão registrada.` });
  const testesSemResultado = testes.filter(t => t.status === 'concluido' && !preenchido(t.resultado));
  if (testesSemResultado.length) alertas.push({ nivel: 'dado', texto: `${testesSemResultado.length} teste(s) concluído(s) sem resultado: informe o número real, sem estimar.` });
  if (emp.restricoes && sensiveis.length) alertas.push({ nivel: 'alto', texto: `Há restrições informadas (${String(emp.restricoes).slice(0, 80)}): revise as peças marcadas.` });

  const proximos = conteudos.filter(c => c.data && c.data >= hoje && c.data <= somaDias(hoje, 14) && c.status !== 'publicado');
  return { hoje, onboarding: faltaOnboarding(emp), faltaPos, criativos, conteudos, copys, testes, angulos, funil, usoPilar,
           alertas, proximos, aprendizados: (dados.aprendizados || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data))) };
}

/* ===========================================================
   TEXTOS PRONTOS PARA COPIAR
   =========================================================== */
const v = x => preenchido(x) ? x : NI;
function criativoTexto(c, nomeAngulo) {
  const L = [`## Criativo — ${nomeAngulo(c.angulo)} · ${c.formato === 'imagem' ? 'anúncio de imagem' : 'anúncio em vídeo'}`];
  if (c.formato === 'imagem') L.push(`- Ideia principal: ${v(c.ideia)}`, `- Texto na imagem: ${v(c.textoImagem)}`, `- Hierarquia: ${v(c.hierarquia)}`, `- CTA: ${v(c.cta)}`);
  else L.push(`- Hook (1–3 s): ${v(c.hook)}`, `- Prova / demonstração: ${v(c.prova)}`, `- Benefício específico: ${v(c.beneficio)}`, `- Redução de objeção: ${v(c.objecao)}`, `- CTA: ${v(c.cta)}`);
  if (preenchido(c.legenda)) L.push(`- Legenda: ${c.legenda}`);
  const al = conferir(textoDe(c, ['hook', 'prova', 'beneficio', 'objecao', 'cta', 'ideia', 'textoImagem', 'legenda']));
  if (al.length) L.push(`- ⚠ Confirmar antes de publicar: ${al.join('; ')}`);
  return L.join('\n');
}
function conteudoTexto(c, nomePilar) {
  return [`## ${v(c.data)} · ${v(c.canal)} · ${v(c.formato)}${c.pilar ? ` · pilar: ${nomePilar(c.pilar)}` : ''}`,
    `- Objetivo: ${v(c.objetivo)}`, `- Público: ${v(c.publico)}`, `- Formato: ${v(c.formato)}`, `- Assunto: ${v(c.assunto)}`,
    `- Gancho: ${v(c.gancho)}`, `- Roteiro / copy: ${v(c.roteiro)}`, `- CTA: ${v(c.cta)}`, `- Material visual sugerido: ${v(c.visual)}`].join('\n');
}
function mapa(dados) {
  const a = analisar(dados);
  const emp = dados.empresa || {}, pos = dados.posicionamento || {};
  const nomeAng = k => (ANGULOS.find(x => x[0] === k) || [k, k])[1];
  const nomePil = id => ((dados.pilares || []).find(p => p.id === id) || {}).nome || id;
  const L = [`# Mapa de Comunicação — ${emp.nicho || 'a empresa'} — ${a.hoje}`, ''];
  if (a.onboarding.length) L.push('> Falta: ' + a.onboarding.map(o => o.pergunta.toLowerCase()).join('; ') + '.', '');
  L.push('## Base', ...PERGUNTAS.map(([k, n]) => `- **${n}:** ${v(emp[k])}`), '');
  L.push('## Posicionamento', `- **Proposta de valor:** ${v(pos.propostaValor)}`, `- **Público:** ${v(pos.publico)}`,
    `- **Problema:** ${v(pos.problema)}`, `- **Mecanismo:** ${v(pos.mecanismo)}`, `- **Diferenciais:** ${v(pos.diferenciais)}`, '');
  L.push('## Pilares', ...((dados.pilares || []).length ? dados.pilares.map(p => `- **${p.nome}** — ${v(p.descricao)}`) : ['- Nenhum pilar definido.']), '');
  L.push('## Funil', ...a.funil.map(f => `- ${f.nome}: ${f.conteudos} conteúdo(s), ${f.criativos} criativo(s)`), '');
  L.push('## Ângulos de criativo usados', a.angulos.map(x => `${x.nome}: ${x.qtd}`).join(' · '), '');
  if (a.alertas.length) L.push('## Alertas', ...a.alertas.map(x => `- [${x.nivel}] ${x.texto}`), '');
  if (a.proximos.length) L.push('## Próximos 14 dias', ...a.proximos.map(c => conteudoTexto(c, nomePil)), '');
  if (a.criativos.length) L.push('# Criativos', ...a.criativos.map(c => criativoTexto(c, nomeAng)), '');
  if (a.testes.length) {
    L.push('# Testes', '| Hipótese | Variável | Criativo | Resultado | Próxima decisão | Status |', '| --- | --- | --- | --- | --- | --- |');
    L.push(...a.testes.map(t => `| ${v(t.hipotese)} | ${v(t.variavel)} | ${v(t.criativo)} | ${v(t.resultado)} | ${v(t.decisao)} | ${t.status || 'planejado'} |`), '');
  }
  if (a.aprendizados.length) L.push('# Aprendizados', ...a.aprendizados.map(x => `- ${x.data} [${NATUREZAS[x.natureza] || 'OBSERVAÇÃO'}] ${x.texto}`));
  return L.join('\n');
}

module.exports = { analisar, mapa, criativoTexto, conteudoTexto, conferir, checarCriativo, checarConteudo, faltaOnboarding,
                   PERGUNTAS, ETAPAS, ANGULOS, NATUREZAS, NI };
