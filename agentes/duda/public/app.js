/* ===========================================================
   Painel da Duda — a tela. As regras moram no servidor (regras.js);
   aqui só se edita e se mostra.
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
  ['nicho', 'Empresa / nicho', 'text'], ['produto', 'Produto ou serviço', 'area'], ['publico', 'Público', 'area'],
  ['problema', 'Problema que resolve', 'area'], ['diferenciais', 'Diferenciais verdadeiros', 'area'], ['ticket', 'Ticket', 'text'],
  ['canais', 'Canais atuais', 'area'], ['tom', 'Tom de voz', 'area'], ['objetivo', 'Objetivo da campanha', 'area'],
  ['restricoes', 'Restrições legais / comerciais', 'area'], ['exemplos', 'Exemplos de comunicação aprovados', 'area', 'links ou trechos']
];
const ANGULOS = [['dor', 'Dor'], ['desejo', 'Desejo'], ['demonstracao', 'Demonstração'], ['comparacao', 'Comparação'],
  ['quebra', 'Quebra de padrão'], ['objecao', 'Objeção'], ['bastidor', 'Bastidor'], ['prova', 'Prova real']];
const ETAPAS = [['descoberta', 'Descoberta'], ['consideracao', 'Consideração'], ['prova', 'Prova'], ['conversao', 'Conversão']];
const NAT = { fato: 'FATO', observacao: 'OBSERVAÇÃO', hipotese: 'HIPÓTESE' };
const nome = (lista, k) => (lista.find(x => x[0] === k) || [k, k])[1];

let dados = null, an = null;
const brutos = {};

const api = async (url, opt) => {
  const r = await fetch(url, opt && opt.body ? Object.assign({ headers: { 'Content-Type': 'application/json' } }, opt, { body: JSON.stringify(opt.body) }) : opt);
  const j = (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text();
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
const form = el => Object.fromEntries(new FormData(el).entries());
const alertasHTML = al => al && al.length ? `<div class="conferir">⚠ Confirmar antes de publicar: ${esc(al.join('; '))}</div>` : '';
const opcoes = (lista, sel) => lista.map(([k, n]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${n}</option>`).join('');

async function carregar() {
  [dados, an, brutos.mapa] = await Promise.all([api('api/dados'), api('api/analise'), api('api/mapa')]);
  desenhar();
}
function desenhar() { boasVindas(); mapa(); posicionamento(); criativos(); calendario(); copys(); testes(); }

/* primeira resposta: apresentação + só o que falta para o Mapa de Comunicação */
function boasVindas() {
  const falta = an.onboarding;
  $('#boasvindas').innerHTML = falta.length ? `<div class="ola"><div class="foto grande">DU</div><div>
    <h2>Oi, eu sou a Duda, responsável por Marketing &amp; Conteúdo.</h2>
    <p><b>Para criar o Mapa de Comunicação, preciso saber:</b></p>
    <ol>${falta.map(f => `<li>${esc(f.pergunta)}</li>`).join('')}</ol>
    <p class="dim">Responda no formulário abaixo. Sem isso, qualquer campanha seria fórmula genérica.</p></div></div>` : '';
}

function mapa() {
  $('#alertas').innerHTML = an.alertas.length
    ? an.alertas.map(x => `<div class="alerta ${x.nivel}"><i>${{ alto: 'alto', medio: 'médio', dado: 'dado' }[x.nivel]}</i>${esc(x.texto)}</div>`).join('')
    : '<p class="dim">Nenhum alerta.</p>';
  $('#funil').innerHTML = `<table><tr><th>Etapa</th><th class="r">Conteúdos</th><th class="r">Criativos</th></tr>
    ${an.funil.map(f => `<tr class="${f.conteudos + f.criativos ? '' : 'vazio'}"><td>${esc(f.nome)}</td><td class="r">${f.conteudos}</td><td class="r">${f.criativos}</td></tr>`).join('')}</table>`;
  const e = dados.empresa || {};
  $('#f-emp').innerHTML = PERGUNTAS.map(([k, rot, t, ph]) => `<label class="${String(e[k] || '').trim() ? '' : 'falta'}"><span>${esc(rot)}</span>${t === 'area'
    ? `<textarea name="${k}" rows="2" placeholder="${esc(ph || '')}">${esc(e[k] || '')}</textarea>`
    : `<input name="${k}" value="${esc(e[k] || '')}">`}</label>`).join('');
  $('#mapa').innerHTML = md(brutos.mapa);
  $('#baixar').href = URL.createObjectURL(new Blob([brutos.mapa], { type: 'text/markdown' }));
  $('#baixar').download = `mapa-de-comunicacao-${an.hoje}.md`;
}
$('#salvar-emp').addEventListener('click', async () => { await api('api/empresa', { method: 'PUT', body: form($('#f-emp')) }); toast('Mapa salvo.'); carregar(); });

function posicionamento() {
  const p = dados.posicionamento || {};
  for (const k of ['propostaValor', 'publico', 'problema', 'mecanismo', 'diferenciais']) $(`#f-pos [name=${k}]`).value = p[k] || '';
  $('#pilares').innerHTML = an.usoPilar.length ? dados.pilares.map(p => {
    const uso = an.usoPilar.find(u => u.id === p.id);
    return `<div class="it"><b>${esc(p.nome)}</b> — ${v(p.descricao)}${p.objetivo ? ` · <span class="dim">${esc(p.objetivo)}</span>` : ''}
      <span class="cont">${uso.conteudos} conteúdo(s)</span><button class="x" data-del="pilares" data-id="${esc(p.id)}">✕</button></div>`;
  }).join('') : '<p class="dim">Nenhum pilar ainda.</p>';
  $('#f-con [name=pilar]').innerHTML = '<option value="">—</option>' + dados.pilares.map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('');
}
$('#salvar-pos').addEventListener('click', async () => { await api('api/posicionamento', { method: 'PUT', body: form($('#f-pos')) }); toast('Posicionamento salvo.'); carregar(); });
$('#f-pilar').addEventListener('submit', async e => {
  e.preventDefault();
  try { await api('api/pilares', { method: 'POST', body: form(e.target) }); e.target.reset(); carregar(); } catch (er) { toast(er.message); }
});

/* ---------- criativos ---------- */
$('#f-cri [name=angulo]').innerHTML = opcoes(ANGULOS);
for (const s of ['#f-cri [name=etapa]', '#f-con [name=etapa]']) $(s).innerHTML = opcoes(ETAPAS);
function formatoCriativo() {
  const img = $('#f-cri [name=formato]').value === 'imagem';
  $$('#f-cri .so-video').forEach(el => { el.hidden = img; });
  $$('#f-cri .so-imagem').forEach(el => { el.hidden = !img; });
}
$('#f-cri [name=formato]').addEventListener('change', formatoCriativo); formatoCriativo();
function criativos() {
  $('#angulos').innerHTML = an.angulos.map(a => `<span class="ang ${a.qtd ? 'usado' : ''}">${esc(a.nome)} <b>${a.qtd}</b></span>`).join('');
  $('#criativos').innerHTML = an.criativos.map(c => `<div class="calc">
    <div class="cab"><h3>${esc(nome(ANGULOS, c.angulo))} · ${c.formato === 'imagem' ? 'imagem' : 'vídeo'} · ${esc(nome(ETAPAS, c.etapa))}</h3>
      <button class="x" data-del="criativos" data-id="${esc(c.id)}">✕</button></div>
    ${c.titulo ? `<b class="res">${esc(c.titulo)}</b>` : ''}
    <ul class="entradas">${c.formato === 'imagem'
      ? `<li><span>Ideia principal</span><em>${v(c.ideia)}</em></li><li><span>Texto na imagem</span><em>${v(c.textoImagem)}</em></li><li><span>Hierarquia</span><em>${v(c.hierarquia)}</em></li>`
      : `<li><span>Hook (1–3 s)</span><em>${v(c.hook)}</em></li><li><span>Prova</span><em>${v(c.prova)}</em></li><li><span>Benefício</span><em>${v(c.beneficio)}</em></li><li><span>Objeção</span><em>${v(c.objecao)}</em></li>`}
      <li><span>CTA</span><em>${v(c.cta)}</em></li></ul>
    ${c.falta.length ? `<p class="leitura ni">Falta no padrão: ${esc(c.falta.join(', '))}</p>` : '<p class="leitura ok">Completo no padrão de anúncio.</p>'}
    ${alertasHTML(c.alertas)}
    <div class="acoes"><select data-status="criativos" data-id="${esc(c.id)}">${['rascunho', 'aprovado', 'no ar', 'pausado'].map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <button class="mini" data-copiar-texto="criativos/${esc(c.id)}">copiar</button></div></div>`).join('') || '<p class="dim">Nenhum criativo ainda.</p>';
}
$('#f-cri').addEventListener('submit', async e => {
  e.preventDefault(); await api('api/criativos', { method: 'POST', body: form(e.target) });
  e.target.reset(); formatoCriativo(); toast('Criativo criado.'); carregar();
});

/* ---------- calendário ---------- */
function calendario() {
  const pil = id => (dados.pilares.find(p => p.id === id) || {}).nome || '';
  $('#calendario').innerHTML = an.conteudos.length ? an.conteudos.map(c => `<div class="it conteudo ${c.status === 'publicado' ? 'feito' : ''}">
    <div class="cab"><b>${v(c.data)} · ${v(c.canal)} · ${v(c.formato)}</b>
      <span class="dim">${esc(nome(ETAPAS, c.etapa))}${pil(c.pilar) ? ' · ' + esc(pil(c.pilar)) : ''}</span></div>
    <p><span class="dim">Objetivo:</span> ${v(c.objetivo)} · <span class="dim">Assunto:</span> ${v(c.assunto)}</p>
    <p><span class="dim">Gancho:</span> ${v(c.gancho)} · <span class="dim">CTA:</span> ${v(c.cta)}</p>
    ${c.falta.length ? `<p class="ni">Falta no padrão: ${esc(c.falta.join(', '))}</p>` : ''}${alertasHTML(c.alertas)}
    <div class="acoes"><select data-status="conteudos" data-id="${esc(c.id)}">${['ideia', 'produção', 'aprovado', 'publicado'].map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <button class="mini" data-copiar-texto="conteudos/${esc(c.id)}">copiar</button><button class="x" data-del="conteudos" data-id="${esc(c.id)}">✕</button></div></div>`).join('')
    : '<p class="dim">Calendário vazio. Cada conteúdo precisa de um objetivo — nada de preencher por preencher.</p>';
}
$('#f-con').addEventListener('submit', async e => {
  e.preventDefault(); await api('api/conteudos', { method: 'POST', body: form(e.target) }); e.target.reset(); toast('Conteúdo no calendário.'); carregar();
});

/* ---------- copy ---------- */
const TIPOS_COPY = [['hook', 'Hooks'], ['headline', 'Headlines'], ['corpo', 'Corpo'], ['cta', 'CTAs'], ['legenda', 'Legendas'], ['pagina', 'Páginas'], ['email', 'E-mails']];
function copys() {
  const html = TIPOS_COPY.map(([k, n]) => {
    const l = an.copys.filter(c => c.tipo === k);
    return l.length ? `<div class="bloco"><h2>${n} <span class="cont">${l.length}</span></h2>${l.map(c => `<div class="it">
      ${c.contexto ? `<small class="dim">${esc(c.contexto)}</small><br>` : ''}<span class="texto" id="cp-${esc(c.id)}">${esc(c.texto)}</span>${alertasHTML(c.alertas)}
      <div class="acoes"><button class="mini" data-copiar-el="cp-${esc(c.id)}">copiar</button><button class="x" data-del="copys" data-id="${esc(c.id)}">✕</button></div></div>`).join('')}</div>` : '';
  }).join('');
  $('#copys').innerHTML = html || '<p class="dim">Biblioteca vazia.</p>';
}
$('#f-copy').addEventListener('submit', async e => { e.preventDefault(); await api('api/copys', { method: 'POST', body: form(e.target) }); e.target.reset(); toast('Copy guardada.'); carregar(); });

/* ---------- testes & aprendizados ---------- */
function testes() {
  $('#testes').innerHTML = an.testes.length ? `<table><tr><th>Hipótese</th><th>Variável</th><th>Criativo</th><th>Métrica</th><th>Resultado (real)</th><th>Próxima decisão</th><th>Status</th><th></th></tr>
    ${an.testes.map(t => `<tr data-id="${esc(t.id)}"><td>${esc(t.hipotese)}</td><td>${v(t.variavel)}</td><td>${v(t.criativo)}</td><td>${v(t.metrica)}</td>
      <td><input data-campo="resultado" value="${esc(t.resultado || '')}" placeholder="${NI}"></td>
      <td><input data-campo="decisao" value="${esc(t.decisao || '')}" placeholder="${NI}"></td>
      <td><select data-campo="status">${['planejado', 'rodando', 'concluido'].map(s => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td><button class="x" data-del="testes" data-id="${esc(t.id)}">✕</button></td></tr>`).join('')}</table>` : '<p class="dim">Nenhum teste ainda.</p>';
  $('#aprendizados').innerHTML = an.aprendizados.map(a => `<div class="it"><small class="dim">${esc(a.data)}</small> <i class="nat ${a.natureza}">${NAT[a.natureza]}</i>${esc(a.texto)}
    <button class="x" data-del="aprendizados" data-id="${esc(a.id)}">✕</button></div>`).join('') || '<p class="dim">Nenhum aprendizado ainda.</p>';
}
$('#f-teste').addEventListener('submit', async e => { e.preventDefault(); await api('api/testes', { method: 'POST', body: form(e.target) }); e.target.reset(); toast('Teste registrado.'); carregar(); });
$('#testes').addEventListener('change', async e => {
  const k = e.target.dataset.campo; if (!k) return;
  await api('api/testes/' + e.target.closest('tr').dataset.id, { method: 'PUT', body: { [k]: e.target.value } }); toast('Teste atualizado.'); carregar();
});
$('#f-apr [name=data]').value = new Date().toISOString().slice(0, 10);
$('#f-apr').addEventListener('submit', async e => { e.preventDefault(); await api('api/aprendizados', { method: 'POST', body: form(e.target) }); e.target.texto.value = ''; carregar(); });

/* ---------- geral ---------- */
document.addEventListener('change', async e => {
  const col = e.target.dataset.status; if (!col) return;
  await api(`api/${col}/${e.target.dataset.id}`, { method: 'PUT', body: { status: e.target.value } }); toast('Status: ' + e.target.value); carregar();
});
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const copiar = async t => { try { await navigator.clipboard.writeText(t); toast('Copiado.'); } catch (er) { toast('O navegador não deixou copiar.'); } };
  if (b.dataset.del) {
    if (!await confirmar('Excluir este item? Isso não dá para desfazer.')) return;
    await api(`api/${b.dataset.del}/${b.dataset.id}?confirmar=sim`, { method: 'DELETE' }); toast('Excluído.'); carregar();
  }
  if (b.dataset.copiar) copiar(brutos[b.dataset.copiar] || '');
  if (b.dataset.copiarTexto) copiar(await api('api/texto/' + b.dataset.copiarTexto));
  if (b.dataset.copiarEl) copiar($('#' + b.dataset.copiarEl).textContent);
});

/** markdown mínimo: títulos, listas, tabelas, citação e negrito */
function md(t) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const linhas = String(t || '').split('\n'); let html = '', i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (/^\|/.test(l)) {
      const rows = []; while (i < linhas.length && /^\|/.test(linhas[i])) rows.push(linhas[i++]);
      const cel = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      html += `<table><tr>${cel(rows[0]).map(c => `<th>${inl(c)}</th>`).join('')}</tr>${rows.slice(2).map(r => `<tr>${cel(r).map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</table>`;
      continue;
    }
    if (/^- /.test(l)) { const it = []; while (i < linhas.length && /^- /.test(linhas[i])) it.push(linhas[i++].slice(2)); html += `<ul>${it.map(x => `<li>${inl(x)}</li>`).join('')}</ul>`; continue; }
    if (/^## /.test(l)) html += `<h3>${inl(l.slice(3))}</h3>`;
    else if (/^# /.test(l)) html += `<h2>${inl(l.slice(2))}</h2>`;
    else if (/^> /.test(l)) html += `<blockquote>${inl(l.slice(2))}</blockquote>`;
    else if (l.trim()) html += `<p>${inl(l)}</p>`;
    i++;
  }
  return html;
}

function abrirAba(id) {
  $$('#abas button').forEach(b => b.classList.toggle('on', b.dataset.aba === id));
  $$('.aba').forEach(s => s.classList.toggle('on', s.id === 'aba-' + id));
  try { localStorage.setItem('duda-aba', id); } catch (er) { /* sem storage */ }
}
$('#abas').addEventListener('click', e => { if (e.target.dataset.aba) abrirAba(e.target.dataset.aba); });
try { const a = localStorage.getItem('duda-aba'); if (a && $('#aba-' + a)) abrirAba(a); } catch (er) { /* sem storage */ }

carregar();
})();
