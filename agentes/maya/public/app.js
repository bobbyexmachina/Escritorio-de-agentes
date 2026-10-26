/* ===========================================================
   Painel da Maya Albuquerque — a tela. As regras moram no servidor
   (regras.js); aqui só se edita e se mostra.
   =========================================================== */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NI = 'não informado';
const v = x => String(x == null ? '' : x).trim() ? esc(x) : `<span class="ni">${NI}</span>`;

const PERGUNTAS = [
  ['nome', 'Nome da empresa', 'text'], ['nicho', 'Nicho', 'text'], ['oferta', 'Oferta / produto principal', 'area'],
  ['publico', 'Público', 'area'], ['tamanho', 'Tamanho da operação', 'text', 'faturamento, projetos/mês ou volume'],
  ['equipe', 'Equipe disponível', 'area', 'quem faz o quê'], ['canais', 'Principais canais', 'area', 'de venda e de entrega'],
  ['ferramentas', 'Ferramentas usadas', 'area'], ['objetivo', 'Objetivo atual', 'area'], ['gargalo', 'Maior gargalo', 'area']
];
const NOTAS = [['', '—'], ['1', '1 · baixo'], ['2', '2 · médio'], ['3', '3 · alto']];
const ROT_NAT = { fato: 'FATO', hipotese: 'HIPÓTESE', recomendacao: 'RECOMENDAÇÃO' };
const TIPOS = { gargalo: 'Gargalos', dependencia: 'Dependências', risco: 'Riscos', situacao: 'Situação' };
const STATUS = ['a fazer', 'em andamento', 'bloqueada', 'feita'];

let dados = null, an = null, itensDiag = [];

const api = async (url, opt) => {
  const r = await fetch(url, opt && opt.body ? Object.assign({ headers: { 'Content-Type': 'application/json' } }, opt, { body: JSON.stringify(opt.body) }) : opt);
  const ct = r.headers.get('content-type') || '';
  const j = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error((j && j.motivo) || r.status);
  return j;
};
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
function confirmar(texto) {
  return new Promise(ok => {
    $('#c-texto').textContent = texto; $('#confirma').hidden = false;
    const fim = r => { $('#confirma').hidden = true; ok(r); };
    $('#c-sim').onclick = () => fim(true); $('#c-nao').onclick = () => fim(false);
  });
}

async function carregar() {
  [dados, an] = await Promise.all([api('api/dados'), api('api/analise')]);
  itensDiag = (dados.diagnostico.itens || []).slice();
  desenhar();
}

function desenhar() {
  boasVindas(); kpis(); formEmpresa(); diagnostico(); planejar(); executar(); revisar(); textos();
}

/* primeira resposta: uma frase de apresentação + só o que falta para o Mapa */
function boasVindas() {
  const falta = an.onboarding;
  if (!falta.length) { $('#boasvindas').innerHTML = ''; return; }
  $('#boasvindas').innerHTML = `<div class="ola"><div class="foto grande">MA</div><div>
    <h2>Sou a Maya Albuquerque, diretora de operações: transformo objetivos e informações soltas numa operação clara, priorizada e mensurável.</h2>
    <p><b>Para montar o Mapa da Operação, preciso saber:</b></p>
    <ol>${falta.map(f => `<li>${esc(f.pergunta)}</li>`).join('')}</ol>
    <p class="dim">Responda no formulário abaixo. Não monto plano genérico antes de entender a operação.</p></div></div>`;
}

function kpis() {
  const r = an.revisao;
  const cards = [
    ['Ações abertas', r.abertas, ''], ['Atrasadas', r.atrasadas.length, r.atrasadas.length ? 'ruim' : 'ok'],
    ['Bloqueadas', r.bloqueadas.length, r.bloqueadas.length ? 'ruim' : 'ok'],
    ['Cumprimento de prazo', r.cumprimento === null ? NI : Math.round(r.cumprimento * 100) + '%', r.cumprimento === null ? 'nd' : r.cumprimento < .7 ? 'ruim' : 'ok'],
    ['SOPs', an.contagem.sops, ''], ['Rotinas', an.contagem.rotinas, '']
  ];
  const html = cards.map(([k, val, s]) => `<div class="kpi ${s}"><span>${esc(k)}</span><b>${esc(val)}</b></div>`).join('');
  $('#kpis').innerHTML = html; $('#kpis-rev').innerHTML = html;
}

/* ---------- Mapa ---------- */
function formEmpresa() {
  const e = dados.empresa || {};
  $('#f-emp').innerHTML = PERGUNTAS.map(([k, rot, t, ph]) => `<label class="${String(e[k] || '').trim() ? '' : 'falta'}"><span>${esc(rot)}</span>${t === 'area'
    ? `<textarea name="${k}" rows="2" placeholder="${esc(ph || '')}">${esc(e[k] || '')}</textarea>`
    : `<input name="${k}" value="${esc(e[k] || '')}" placeholder="${esc(ph || '')}">`}</label>`).join('');
}
$('#salvar-emp').addEventListener('click', async e => {
  e.preventDefault();
  const f = new FormData($('#f-emp')), b = {};
  for (const [k] of PERGUNTAS) b[k] = String(f.get(k) || '');
  await api('api/empresa', { method: 'PUT', body: b }); toast('Mapa da Operação salvo.'); carregar();
});

/* ---------- Diagnosticar ---------- */
function diagnostico() {
  $('#d-objetivo').value = dados.diagnostico.objetivo || '';
  $('#d-situacao').value = dados.diagnostico.situacao || '';
  desenharItens();
}
function desenharItens() {
  $('#d-itens').innerHTML = Object.entries(TIPOS).map(([t, nome]) => `<div class="coluna-d"><h3>${nome}</h3>${
    itensDiag.filter(i => i.tipo === t).map(i => `<div class="it"><i class="nat ${i.natureza}">${ROT_NAT[i.natureza]}</i>${esc(i.texto)}
      <button class="x" data-del-item="${esc(i.id)}">✕</button></div>`).join('') || '<p class="dim">—</p>'}</div>`).join('');
}
$('#f-item').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  itensDiag.push({ id: 'n' + Date.now(), tipo: f.get('tipo'), texto: f.get('texto'), natureza: f.get('natureza') });
  e.target.texto.value = ''; desenharItens(); toast('Item adicionado — clique em Salvar diagnóstico.');
});
$('#salvar-diag').addEventListener('click', async () => {
  await api('api/diagnostico', { method: 'PUT', body: { objetivo: $('#d-objetivo').value, situacao: $('#d-situacao').value, itens: itensDiag } });
  toast('Diagnóstico salvo.'); carregar();
});

/* ---------- Planejar ---------- */
for (const k of ['impacto', 'urgencia', 'esforco']) $(`#f-acao [name=${k}]`).innerHTML = NOTAS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
function planejar() {
  $('#formula').textContent = an.formula + ' · notas de 1 a 3';
  $('#f-acao [name=dependeDe]').innerHTML = an.acoes.filter(a => a.status !== 'feita').map(a => `<option value="${esc(a.id)}">${esc(a.titulo)}</option>`).join('');
  const quad = { 'fazer já': 'alto impacto · pouco esforço', projeto: 'alto impacto · muito esforço', 'ajuste rápido': 'baixo impacto · pouco esforço', adiar: 'baixo impacto · muito esforço' };
  const top = new Set(an.top3.map(a => a.id));
  $('#matriz').innerHTML = Object.entries(quad).map(([q, d]) => `<div class="quad q-${q.replace(/\W+/g, '')}"><h3>${q}</h3><small>${d}</small>${
    an.ordenadas.filter(a => a.prioridade.quadrante === q).map(a => `<div class="pa ${top.has(a.id) ? 'top' : ''}">${top.has(a.id) ? '<b>★</b> ' : ''}${esc(a.titulo)} <em>${a.prioridade.pontos}</em>${a.travadaPor.length ? ' <i class="trava">bloqueada</i>' : ''}</div>`).join('') || '<p class="dim">—</p>'
  }</div>`).join('') + (an.ordenadas.some(a => a.prioridade.pontos === null)
    ? `<div class="quad"><h3>sem classificação</h3><small>falta impacto, urgência ou esforço</small>${an.ordenadas.filter(a => a.prioridade.pontos === null).map(a => `<div class="pa">${esc(a.titulo)}</div>`).join('')}</div>` : '');

  const lista = [...an.ordenadas, ...an.acoes.filter(a => a.status === 'feita')];
  $('#t-acoes').innerHTML = lista.length ? `<table><tr><th>Ação</th><th>I/U/E</th><th>Pontos</th><th>Responsável</th><th>Prazo</th><th>Critério de conclusão</th><th>Métrica</th><th>Depende de</th><th>Status</th><th></th></tr>
    ${lista.map(a => `<tr class="${a.atrasada ? 'neg' : ''} ${a.status === 'feita' ? 'feita' : ''}">
      <td><b>${esc(a.titulo)}</b>${a.incompleta.length && a.status !== 'feita' ? `<br><small class="ni">falta: ${esc(a.incompleta.join(', '))}</small>` : ''}</td>
      <td>${[a.impacto, a.urgencia, a.esforco].map(x => x || '—').join('/')}</td><td>${a.prioridade.pontos ?? '—'}</td>
      <td>${v(a.responsavel)}</td><td>${v(a.prazo)}${a.atrasada ? ' <i class="trava">atrasada</i>' : ''}</td>
      <td>${v(a.criterio)}</td><td>${v(a.metrica)}</td>
      <td>${a.travadaPor.length ? `<i class="trava">${esc(a.travadaPor.join(', '))}</i>` : '—'}</td>
      <td><select data-status="${esc(a.id)}">${STATUS.map(s => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td><button class="x" data-del="acoes" data-id="${esc(a.id)}" title="Excluir">✕</button></td></tr>`).join('')}</table>`
    : '<p class="dim">Nenhuma ação ainda. Diagnostique antes de planejar.</p>';
}
$('#f-acao').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target), b = {};
  for (const k of ['titulo', 'impacto', 'urgencia', 'esforco', 'responsavel', 'prazo', 'criterio', 'metrica']) b[k] = f.get(k);
  b.dependeDe = f.getAll('dependeDe');
  await api('api/acoes', { method: 'POST', body: b }); e.target.reset(); toast('Ação adicionada.'); carregar();
});
$('#t-acoes').addEventListener('change', async e => {
  const id = e.target.dataset.status; if (!id) return;
  await api('api/acoes/' + id, { method: 'PUT', body: { status: e.target.value } }); toast('Status: ' + e.target.value); carregar();
});

/* ---------- Executar ---------- */
function executar() {
  $('#sops').innerHTML = (dados.sops || []).map(s => `<div class="sop">
    <div class="cab"><h3>${esc(s.titulo)}</h3><div class="acoes"><button class="mini" data-copiar-sop="${esc(s.id)}">copiar checklist</button><button class="x" data-del="sops" data-id="${esc(s.id)}">✕</button></div></div>
    <p class="dim">${s.objetivo ? esc(s.objetivo) + ' · ' : ''}quando: ${v(s.gatilho)} · responsável: ${v(s.responsavel)}</p>
    <ul class="check">${(s.passos || []).map(p => `<li><label><input type="checkbox"> ${esc(p)}</label></li>`).join('')}</ul>
    <p class="dim">Pronto quando: ${v(s.pronto)} · revisado em ${esc(s.revisadoEm || '')}</p></div>`).join('') || '<p class="dim">Nenhum SOP ainda.</p>';
  const cad = { diaria: 'Diária', semanal: 'Semanal', mensal: 'Mensal' };
  $('#rotinas').innerHTML = Object.entries(cad).map(([k, n]) => {
    const rs = (dados.rotinas || []).filter(r => r.cadencia === k);
    return `<h3 class="sub">${n}</h3>` + (rs.map(r => `<div class="it"><b>${esc(r.titulo)}</b> · ${v(r.quando)} · ${v(r.responsavel)}${r.duracao ? ' · ' + esc(r.duracao) : ''}
      ${r.pauta ? `<br><small class="dim">${esc(r.pauta)}</small>` : ''}<button class="x" data-del="rotinas" data-id="${esc(r.id)}">✕</button></div>`).join('') || '<p class="dim">—</p>');
  }).join('');
}
$('#f-sop').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('api/sops', { method: 'POST', body: { titulo: f.get('titulo'), objetivo: f.get('objetivo'), gatilho: f.get('gatilho'),
    responsavel: f.get('responsavel'), pronto: f.get('pronto'), passos: String(f.get('passos') || '').split('\n') } });
  e.target.reset(); toast('SOP criado.'); carregar();
});
$('#f-rot').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target), b = {};
  for (const k of ['cadencia', 'quando', 'titulo', 'responsavel', 'duracao', 'pauta']) b[k] = f.get(k);
  await api('api/rotinas', { method: 'POST', body: b }); e.target.reset(); toast('Rotina adicionada.'); carregar();
});

/* ---------- Revisar ---------- */
function revisar() {
  const r = an.revisao;
  const grupo = (t, l, extra) => `<h3 class="sub">${t} <span class="cont">${l.length}</span></h3>` +
    (l.length ? l.map(a => `<div class="it">${esc(a.titulo)}${extra ? ' · ' + extra(a) : ''}</div>`).join('') : '<p class="dim">Nenhuma.</p>');
  $('#revisao').innerHTML = `<p class="dim">${esc(r.formulaCumprimento)}. ${r.feitas} de ${r.total} ações feitas.</p>` +
    grupo('Atrasadas', r.atrasadas, a => `prazo ${esc(a.prazo)}${a.responsavel ? ' · ' + esc(a.responsavel) : ''}`) +
    grupo('Feitas com atraso', r.feitasComAtraso, a => `prazo ${esc(a.prazo)}, feita em ${esc(a.concluidaEm)}`) +
    grupo('Bloqueadas', r.bloqueadas, a => a.travadaPor.length ? 'depende de ' + esc(a.travadaPor.join(', ')) : 'marcada como bloqueada') +
    grupo('Incompletas', r.incompletas, a => 'falta ' + esc(a.incompleta.join(', ')));
  $('#correcoes').innerHTML = an.correcoes.length ? an.correcoes.map(c => `<div class="it"><i class="nat recomendacao">RECOMENDAÇÃO</i>${esc(c)}</div>`).join('')
    : '<p class="dim">Nada a corrigir agora.</p>';
  if (an.alertas.length) $('#correcoes').innerHTML += an.alertas.map(x => `<div class="alerta ${x.nivel}"><i>${{ alto: 'alto', medio: 'médio', dado: 'dado' }[x.nivel]}</i>${esc(x.texto)}</div>`).join('');
  $('#decisoes').innerHTML = an.decisoes.map(d => `<div class="it"><small class="dim">${esc(d.data)}</small> <i class="nat ${d.natureza}">${ROT_NAT[d.natureza]}</i>${esc(d.texto)}
    <button class="x" data-del="decisoes" data-id="${esc(d.id)}">✕</button></div>`).join('') || '<p class="dim">Nenhuma decisão registrada.</p>';
}
$('#f-dec [name=data]').value = new Date().toISOString().slice(0, 10);
$('#f-dec').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('api/decisoes', { method: 'POST', body: { data: f.get('data'), texto: f.get('texto'), natureza: f.get('natureza') } });
  e.target.texto.value = ''; toast('Decisão registrada.'); carregar();
});

/* ---------- textos: resumo executivo e entrega ---------- */
const brutos = {};
async function textos() {
  [brutos['resumo-md'], brutos['entrega-md']] = await Promise.all([api('api/resumo'), api('api/entrega')]);
  $('#resumo').innerHTML = md(brutos['resumo-md']);
  $('#entrega').innerHTML = md(brutos['entrega-md']);
  $('#baixar').href = URL.createObjectURL(new Blob([brutos['entrega-md']], { type: 'text/markdown' }));
  $('#baixar').download = `operacao-${new Date().toISOString().slice(0, 10)}.md`;
}
/** markdown mínimo: títulos, listas, tabelas, citação, negrito e itálico */
function md(t) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/_(.+?)_/g, '<em>$1</em>');
  const linhas = t.split('\n'); let html = '', i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (/^\|/.test(l)) {
      const rows = []; while (i < linhas.length && /^\|/.test(linhas[i])) rows.push(linhas[i++]);
      const cel = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      html += `<table><tr>${cel(rows[0]).map(c => `<th>${inl(c)}</th>`).join('')}</tr>${rows.slice(2).map(r => `<tr>${cel(r).map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</table>`;
      continue;
    }
    if (/^- \[ \] /.test(l)) html += `<p>☐ ${inl(l.slice(6))}</p>`;
    else if (/^(- |\d+\. )/.test(l)) {
      const ord = /^\d+\. /.test(l); const items = [];
      while (i < linhas.length && /^(- |\d+\. )/.test(linhas[i])) items.push(linhas[i++].replace(/^(- |\d+\. )/, ''));
      html += `<${ord ? 'ol' : 'ul'}>${items.map(x => `<li>${inl(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`; continue;
    }
    else if (/^## /.test(l)) html += `<h3>${inl(l.slice(3))}</h3>`;
    else if (/^# /.test(l)) html += `<h2>${inl(l.slice(2))}</h2>`;
    else if (/^> /.test(l)) html += `<blockquote>${inl(l.slice(2))}</blockquote>`;
    else if (l.trim()) html += `<p>${inl(l)}</p>`;
    i++;
  }
  return html;
}

/* ---------- cliques gerais ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.delItem) { itensDiag = itensDiag.filter(i => i.id !== b.dataset.delItem); desenharItens(); toast('Removido — clique em Salvar diagnóstico.'); return; }
  if (b.dataset.del) {
    if (!await confirmar('Excluir este item? Isso não dá para desfazer.')) return;
    await api(`api/${b.dataset.del}/${b.dataset.id}?confirmar=sim`, { method: 'DELETE' }); toast('Excluído.'); carregar(); return;
  }
  const copiar = async t => { try { await navigator.clipboard.writeText(t); toast('Copiado.'); } catch (er) { toast('O navegador não deixou copiar.'); } };
  if (b.dataset.copiar) copiar(brutos[b.dataset.copiar] || '');
  if (b.dataset.copiarSop) copiar(await api('api/sop/' + b.dataset.copiarSop));
});

function abrirAba(id) {
  $$('#abas button').forEach(b => b.classList.toggle('on', b.dataset.aba === id));
  $$('.aba').forEach(s => s.classList.toggle('on', s.id === 'aba-' + id));
  try { localStorage.setItem('maya-aba', id); } catch (er) { /* sem storage */ }
}
$('#abas').addEventListener('click', e => { if (e.target.dataset.aba) abrirAba(e.target.dataset.aba); });
try { const a = localStorage.getItem('maya-aba'); if (a && $('#aba-' + a)) abrirAba(a); } catch (er) { /* sem storage */ }

carregar();
})();
