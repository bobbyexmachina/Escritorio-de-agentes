/* ===========================================================
   Painel da Bia — a tela. As regras moram no servidor (regras.js);
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
  ['nicho', 'Empresa / nicho', 'text'], ['produtos', 'Produtos e serviços', 'area'], ['canais', 'Canais de atendimento', 'area'],
  ['horarios', 'Horários e regras', 'area'], ['tom', 'Tom de voz', 'area'], ['duvidas', 'Principais dúvidas', 'area'],
  ['politicas', 'Políticas oficiais', 'area', 'prazos, revisões, pagamento, cancelamento'], ['humano', 'Situações que exigem uma pessoa', 'area'],
  ['materiais', 'Materiais de referência', 'area', 'links, documentos']
];
const CATEGORIAS = [['orcamento', 'Orçamento / comercial'], ['prazo', 'Prazo / entrega'], ['revisao', 'Revisão / ajuste'], ['arquivo', 'Arquivo / acesso'],
  ['financeiro', 'Pagamento / nota'], ['cancelamento', 'Cancelamento / reembolso'], ['reclamacao', 'Reclamação'], ['duvida', 'Dúvida geral']];
const nomeCat = k => (CATEGORIAS.find(c => c[0] === k) || [k, k])[1];
const STATUS = ['aberto', 'aguardando cliente', 'escalado', 'resolvido'];

let dados = null, an = null, triagem = null, aberto = null;
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
const copiar = async t => { try { await navigator.clipboard.writeText(t); toast('Copiado.'); } catch (er) { toast('O navegador não deixou copiar.'); } };

async function carregar() {
  [dados, an, brutos.resumo] = await Promise.all([api('api/dados'), api('api/analise'), api('api/resumo')]);
  desenhar();
}
function desenhar() { boasVindas(); fila(); base(); sucesso(); feedback(); config(); }

/* primeira resposta: "Vou montar seu sistema de atendimento" + o que falta */
function boasVindas() {
  const falta = an.onboarding;
  $('#boasvindas').innerHTML = falta.length ? `<div class="ola"><div class="foto grande">BI</div><div>
    <h2>Vou montar seu sistema de atendimento.</h2>
    <p>Sou a Bia, de Atendimento &amp; Sucesso. <b>Antes, preciso saber:</b></p>
    <ol>${falta.map(f => `<li>${esc(f.pergunta)}</li>`).join('')}</ol>
    <div class="acoes"><button class="btn prim" data-ir="config">Responder agora</button></div></div></div>` : '';
}

const linhaCaso = c => `<button class="item" data-caso="${esc(c.id)}">
  <b>${esc(c.cliente || 'cliente')}</b><span class="prio ${c.prioridade.replace('é', 'e').replace('í', 'i')}">${esc(c.prioridade)}</span>
  <small>${esc(nomeCat(c.categoria))} · ${esc(c.resumo || (c.mensagem || '').slice(0, 90))}</small>
  <i class="st">${esc(c.status)}${c.precisaHumano ? ' · precisa de humano' : ''}${c.alertas.length ? ' · ⚠ revisar resposta' : ''}</i></button>`;
function fila() {
  const k = an.contagem;
  $('#kpis').innerHTML = [['Abertos', k.abertos, k.abertos ? '' : 'ok'], ['Escalados', k.escalados, ''], ['Aguardando cliente', k.aguardando, ''],
    ['Resolvidos', k.resolvidos, 'ok'], ['Respostas confirmadas na base', k.faq, k.faq ? 'ok' : 'nd']]
    .map(([n, val, s]) => `<div class="kpi ${s}"><span>${n}</span><b>${val}</b></div>`).join('');
  $('#fila').innerHTML = an.abertos.map(linhaCaso).join('') || '<p class="dim">Nenhum caso aberto.</p>';
  $('#resolvidos').innerHTML = an.casos.filter(c => c.status === 'resolvido').slice(-15).reverse().map(linhaCaso).join('') || '<p class="dim">Nenhum ainda.</p>';
  $('#alertas').innerHTML = an.alertas.map(x => `<div class="alerta ${x.nivel}"><i>${{ alto: 'alto', medio: 'médio', dado: 'dado' }[x.nivel]}</i>${esc(x.texto)}</div>`).join('')
    || '<p class="dim">Nenhum alerta.</p>';
}

/* ---------- novo caso: triagem sugerida, você decide ---------- */
$('#f-caso [name=categoria]').innerHTML = CATEGORIAS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
$('#f-triar').addEventListener('submit', async e => {
  e.preventDefault();
  const b = form(e.target);
  triagem = Object.assign(await api('api/triagem', { method: 'POST', body: { mensagem: b.mensagem } }), b);
  const f = $('#f-caso');
  f.categoria.value = triagem.categoria; f.prioridade.value = triagem.prioridade; f.sentimento.value = triagem.sentimento;
  f.resposta.value = triagem.sugestao; f.precisaHumano.value = String(triagem.precisaHumano);
  f.status.value = triagem.precisaHumano ? 'escalado' : 'aberto'; f.motivo.value = triagem.motivo;
  f.acao.value = triagem.precisaHumano ? 'Encaminhar para a pessoa responsável com o resumo do caso' : (triagem.faq ? 'Enviar a resposta-padrão' : 'Confirmar a informação antes de responder');
  f.resumo.value = ''; f.tema.value = ''; f.historico.value = ''; f.faltam.value = '';
  $('#triagem').innerHTML = [`categoria: ${nomeCat(triagem.categoria)}`, `urgência: ${triagem.urgencia}`, `sentimento: ${triagem.sentimento}`,
    ...triagem.riscos.map(r => `risco: ${r}`), triagem.faq ? `resposta confirmada: ${triagem.faq.pergunta}` : 'sem resposta confirmada na base']
    .map(t => `<span class="tag ${/risco/.test(t) ? 'risco' : ''}">${esc(t)}</span>`).join('');
  $('#caso-bloco').hidden = false; conferirResposta();
});
async function conferirResposta() {
  const r = await api('api/conferir', { method: 'POST', body: { texto: $('#f-caso [name=resposta]').value } });
  $('#conferencia').innerHTML = r.alertas.length ? `<div class="conferir">⚠ Revisar antes de enviar: ${esc(r.alertas.join('; '))}</div>` : '';
}
let tConf; $('#f-caso [name=resposta]').addEventListener('input', () => { clearTimeout(tConf); tConf = setTimeout(conferirResposta, 400); });
$('#f-caso').addEventListener('submit', async e => {
  e.preventDefault();
  const b = form(e.target);
  await api('api/casos', { method: 'POST', body: Object.assign(b, { cliente: triagem.cliente, canal: triagem.canal, mensagem: triagem.mensagem,
    urgencia: triagem.urgencia, riscos: triagem.riscos, precisaHumano: b.precisaHumano === 'true' }) });
  $('#f-triar').reset(); $('#caso-bloco').hidden = true; triagem = null;
  toast('Caso salvo na fila.'); await carregar(); abrirAba('fila');
});

/* ---------- ficha do caso ---------- */
async function abrirCaso(id) {
  aberto = id;
  const c = dados.casos.find(c => c.id === id);
  const ca = an.casos.find(x => x.id === id);
  $('#g-titulo').textContent = `${c.cliente || 'cliente'} · ${c.data}${c.canal ? ' · ' + c.canal : ''}`;
  $('#g-msg').textContent = c.mensagem || '';
  const sel = (n, ops, val) => `<select name="${n}">${ops.map(([k, t]) => `<option value="${k}" ${String(val) === String(k) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  $('#f-edit').innerHTML = `
    <label><span>Categoria</span>${sel('categoria', CATEGORIAS, c.categoria)}</label>
    <label><span>Prioridade</span>${sel('prioridade', ['baixa', 'média', 'alta', 'crítica'].map(p => [p, p]), c.prioridade)}</label>
    <label><span>Status</span>${sel('status', STATUS.map(s => [s, s]), c.status)}</label>
    <label><span>Precisa de humano?</span>${sel('precisaHumano', [['true', 'Sim'], ['false', 'Não']], c.precisaHumano)}</label>
    <label class="largo"><span>Resumo interno</span><input name="resumo" value="${esc(c.resumo || '')}"></label>
    <label class="largo"><span>Resposta ao cliente</span><textarea name="resposta" rows="5">${esc(c.resposta || '')}</textarea></label>
    ${ca.alertas.length ? `<div class="largo conferir">⚠ Revisar antes de enviar: ${esc(ca.alertas.join('; '))}</div>` : ''}
    <label class="largo2"><span>Ação necessária</span><input name="acao" value="${esc(c.acao || '')}"></label>
    <label class="largo2"><span>Motivo</span><input name="motivo" value="${esc(c.motivo || '')}"></label>
    <label class="largo2"><span>Tema</span><input name="tema" value="${esc(c.tema || '')}"></label>
    <label class="largo2"><span>Dados que faltam</span><input name="faltam" value="${esc(c.faltam || '')}"></label>
    <div class="acoes largo"><button class="btn prim">Salvar</button><button class="btn" type="button" data-copiar-caso="${esc(c.id)}">Copiar no formato padrão</button>
      <button class="btn perigo" type="button" data-del="casos" data-id="${esc(c.id)}">Excluir</button></div>`;
  $('#gaveta').hidden = false;
}
$('#f-edit').addEventListener('submit', async e => {
  e.preventDefault();
  const b = form(e.target); b.precisaHumano = b.precisaHumano === 'true';
  await api('api/casos/' + aberto, { method: 'PUT', body: b }); toast('Caso atualizado.'); await carregar(); abrirCaso(aberto);
});
const fechar = () => { $('#gaveta').hidden = true; aberto = null; };
$('#g-fechar').addEventListener('click', fechar);
$('#gaveta').addEventListener('click', e => { if (e.target.id === 'gaveta') fechar(); });

/* ---------- base de conhecimento ---------- */
function base() {
  $('#sugestoes').innerHTML = an.sugestoesFaq.map(s => `<div class="it">${esc(s)}</div>`).join('') || '<p class="dim">Nada se repetindo o bastante ainda.</p>';
  $('#faq').innerHTML = (dados.faq || []).map(f => `<div class="it faq">
    <b>${esc(f.pergunta)}</b> ${f.confirmada ? '<span class="tag ok">confirmada</span>' : '<span class="tag risco">não confirmada</span>'}
    <p>${esc(f.resposta)}</p><small class="dim">Fonte: ${v(f.fonte)}${f.tema ? ' · tema: ' + esc(f.tema) : ''}</small>
    <div class="acoes">${f.confirmada ? '' : `<button class="mini" data-confirmar-faq="${esc(f.id)}">marcar como confirmada</button>`}
      <button class="x" data-del="faq" data-id="${esc(f.id)}">✕</button></div></div>`).join('') || '<p class="dim">Base vazia.</p>';
}
$('#f-faq').addEventListener('submit', async e => {
  e.preventDefault();
  const b = form(e.target); b.confirmada = !!b.confirmada;
  await api('api/faq', { method: 'POST', body: b }); e.target.reset(); toast('Resposta-padrão adicionada.'); carregar();
});

/* ---------- sucesso do cliente ---------- */
function sucesso() {
  const et = { onboarding: 'Onboarding', acompanhamento: 'Acompanhamento', prevencao: 'Prevenção de dúvidas' };
  $('#sucesso').innerHTML = Object.entries(et).map(([k, n]) => `<div class="bloco"><h2>${n}</h2>${(dados.sucesso || []).filter(s => s.etapa === k)
    .map(s => `<div class="it"><b>${v(s.quando)}</b> · ${v(s.produto)}<br>${v(s.acao)}${s.mensagem ? `<pre class="msg" id="suc-${esc(s.id)}">${esc(s.mensagem)}</pre>
      <button class="mini" data-copiar-el="suc-${esc(s.id)}">copiar</button>` : ''}<button class="x" data-del="sucesso" data-id="${esc(s.id)}">✕</button></div>`).join('')
    || '<p class="dim">—</p>'}</div>`).join('');
}
$('#f-suc').addEventListener('submit', async e => { e.preventDefault(); await api('api/sucesso', { method: 'POST', body: form(e.target) }); e.target.reset(); carregar(); });

/* ---------- feedback ---------- */
function feedback() {
  $('#temas').innerHTML = an.temas.length ? `<table><tr><th>Tema</th><th class="r">Casos</th><th class="r">Com reclamação</th><th class="r">Abertos</th><th class="r">Precisaram de humano</th></tr>
    ${an.temas.map(t => `<tr><td>${esc(t.tema)}</td><td class="r">${t.total}</td><td class="r">${t.reclamacoes}</td><td class="r">${t.abertos}</td><td class="r">${t.humano}</td></tr>`).join('')}</table>`
    : '<p class="dim">Sem casos ainda.</p>';
  $('#resumo').innerHTML = md(brutos.resumo);
}

/* ---------- configuração ---------- */
function config() {
  const e = dados.empresa || {};
  $('#f-emp').innerHTML = PERGUNTAS.map(([k, rot, t, ph]) => `<label class="${String(e[k] || '').trim() ? '' : 'falta'}"><span>${esc(rot)}</span>${t === 'area'
    ? `<textarea name="${k}" rows="2" placeholder="${esc(ph || '')}">${esc(e[k] || '')}</textarea>` : `<input name="${k}" value="${esc(e[k] || '')}">`}</label>`).join('');
}
$('#salvar-emp').addEventListener('click', async () => { await api('api/empresa', { method: 'PUT', body: form($('#f-emp')) }); toast('Onboarding salvo.'); carregar(); });

/* ---------- geral ---------- */
document.addEventListener('click', async e => {
  const caso = e.target.closest('[data-caso]'); if (caso) { abrirCaso(caso.dataset.caso); return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.ir) abrirAba(b.dataset.ir);
  if (b.dataset.del) {
    if (!await confirmar('Excluir este item? Isso não dá para desfazer.')) return;
    await api(`api/${b.dataset.del}/${b.dataset.id}?confirmar=sim`, { method: 'DELETE' }); if (b.dataset.del === 'casos') fechar(); toast('Excluído.'); carregar();
  }
  if (b.dataset.confirmarFaq) {
    if (!await confirmar('Confirmar que esta resposta segue a política oficial? Ela passa a ser usada nas sugestões.')) return;
    await api('api/faq/' + b.dataset.confirmarFaq, { method: 'PUT', body: { confirmada: true } }); carregar();
  }
  if (b.dataset.copiar) copiar(brutos[b.dataset.copiar] || '');
  if (b.dataset.copiarCampo) copiar($(`#f-caso [name=${b.dataset.copiarCampo}]`).value);
  if (b.dataset.copiarCaso) copiar(await api('api/texto/casos/' + b.dataset.copiarCaso));
  if (b.dataset.copiarEl) copiar($('#' + b.dataset.copiarEl).textContent);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

function md(t) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const linhas = String(t || '').split('\n'); let html = '', i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
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
}
$('#abas').addEventListener('click', e => { if (e.target.dataset.aba) abrirAba(e.target.dataset.aba); });

carregar();
})();
