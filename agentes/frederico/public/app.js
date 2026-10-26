/* ===========================================================
   Painel do Frederico — a tela. As regras moram no servidor
   (regras.js); aqui só se edita e se mostra.
   =========================================================== */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => new Date().toISOString().slice(0, 10);

const CAMPOS_EMP = [
  ['nomeEmpresa', 'Nome da empresa (assina as mensagens)', 'text'],
  ['produto', 'Produto / serviço', 'area'],
  ['ticketMedio', 'Ticket médio', 'text'],
  ['publicoIdeal', 'Público ideal', 'area'],
  ['origemLeads', 'Origem dos leads', 'area'],
  ['cicloVenda', 'Ciclo de venda', 'text', 'ex.: 3 a 6 semanas'],
  ['canalPrincipal', 'Canal principal', 'text', 'ex.: WhatsApp, e-mail, indicação'],
  ['volumeLeads', 'Volume aproximado de leads / mês', 'text'],
  ['etapasFunil', 'Etapas do funil hoje', 'area'],
  ['objecoes', 'Objeções frequentes', 'area'],
  ['metaComercial', 'Meta comercial', 'text', 'ex.: fechar 4 projetos/mês'],
  ['metaValor', 'Meta em valor fechado no mês (número)', 'text'],
  ['moeda', 'Moeda', 'text', 'BRL'],
  ['condicoes', 'Condições comerciais (preços, pagamento) — usadas nas propostas', 'area'],
  ['icpPerfis', 'ICP — perfis prioritários', 'area'],
  ['icpSinais', 'ICP — sinais de fit', 'area'],
  ['etapasPipeline', 'Etapas do pipeline (só se quiser trocar as padrão)', 'text', 'Novo > Contato > Qualificado > Proposta > Negociação']
];
const OBRIGATORIOS = ['produto', 'ticketMedio', 'publicoIdeal', 'origemLeads', 'cicloVenda', 'canalPrincipal', 'volumeLeads', 'etapasFunil', 'objecoes', 'metaComercial'];

let dados = null, an = null, meta = null, aberto = null;

const api = async (url, opt) => {
  const r = await fetch(url, opt && opt.body ? Object.assign({ headers: { 'Content-Type': 'application/json' } }, opt, { body: JSON.stringify(opt.body) }) : opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.motivo || r.status);
  return j;
};
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
function confirmar(texto, extra) {
  return new Promise(ok => {
    $('#c-texto').textContent = texto; $('#c-extra').innerHTML = extra || '';
    $('#confirma').hidden = false;
    const fim = v => { $('#confirma').hidden = true; $('#c-sim').onclick = $('#c-nao').onclick = null; ok(v); };
    $('#c-sim').onclick = () => fim(true); $('#c-nao').onclick = () => fim(false);
  });
}
const din = v => {
  if (v === '' || v === null || v === undefined || !isFinite(v)) return 'não informado';
  try { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: (dados.empresa.moeda || 'BRL') }); }
  catch (e) { return Number(v).toLocaleString('pt-BR'); }
};
const pct = v => v === null || v === undefined ? 'não informado' : Math.round(v * 100) + '%';
const valorBR = v => { v = String(v || '').replace(/[^\d,.-]/g, ''); if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.'); else v = v.replace(/,/g, ''); return v === '' ? '' : Number(v); };

async function carregar() {
  [dados, an, meta] = await Promise.all([api('api/dados'), api('api/analise'), api('api/meta')]);
  desenhar();
  if (aberto) abrirLead(aberto);
}

/* ===========================================================
   DESENHO
   =========================================================== */
function desenhar() { boasVindas(); kpis(); followups(); alertas(); kanban(); tabela(); analise(); formEmpresa(); }

/* primeira resposta: "Vou montar seu sistema comercial" + o que falta */
function boasVindas() {
  const falta = an.onboarding;
  if (!falta.length && dados.leads.length) { $('#boasvindas').innerHTML = ''; return; }
  $('#boasvindas').innerHTML = `<div class="ola">
    <div class="foto grande">FR</div>
    <div>
      <h2>Vou montar seu sistema comercial.</h2>
      <p>Eu sou o Frederico, de Comercial &amp; CRM: organizo prospecção, qualificação, follow-up, propostas e o pipeline — sem spam, sem pressão e sem prometer o que você não informou.</p>
      ${falta.length ? `<p><b>Antes, preciso de algumas respostas:</b></p><ol>${falta.map(f => `<li>${esc(f.pergunta)}</li>`).join('')}</ol>` : ''}
      ${dados.leads.length ? '' : '<p>Depois, cadastre os leads um a um ou importe a planilha no formato do CRM padrão.</p>'}
      <div class="acoes">
        ${falta.length ? '<button class="btn prim" data-ir="empresa">Responder agora</button>' : ''}
        ${dados.leads.length ? '' : '<button class="btn" data-ir="crm">Importar leads</button>'}
      </div>
    </div></div>`;
}

function kpis() {
  const abertoVal = an.porEtapa.filter(e => !['Ganho', 'Perdido'].includes(e.etapa)).reduce((s, e) => s + e.valor, 0);
  const cards = [
    ['Oportunidades abertas', an.abertos, ''],
    ['Pipeline (valor informado)', din(abertoVal), ''],
    ['Follow-ups atrasados', an.followups.atrasados.length, an.followups.atrasados.length ? 'ruim' : 'ok'],
    ['Sem próximo passo', an.followups.semPasso.length, an.followups.semPasso.length ? 'ruim' : 'ok'],
    ['Ganho x perdido', pct(an.winRate), ''],
    [`Meta de ${an.meta.mes}`, an.meta.valor ? `${an.meta.f.ganho} · ${pct(an.meta.pct)}` : 'não informado', an.meta.pct === null ? 'nd' : an.meta.pct >= 1 ? 'ok' : '']
  ];
  $('#kpis').innerHTML = cards.map(([k, v, s]) => `<div class="kpi ${s}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
}

const linhaLead = a => `<button class="item" data-lead="${esc(a.id)}">
  <b>${esc(a.nome)}</b><span class="tag">${esc(a.etapa)}</span>
  <small>${esc(a.proximoPasso)} · ${esc(a.dataRecomendada)}</small>
  <i class="risco ${a.risco.split(' ')[0]}">risco ${esc(a.risco.split(' —')[0])}</i></button>`;
function followups() {
  const f = an.followups;
  const grupo = (t, l, cls) => `<h3 class="sub ${cls || ''}">${t} <span class="cont">${l.length}</span></h3>` +
    (l.length ? l.map(linhaLead).join('') : '<p class="dim">Nenhum.</p>');
  $('#followups').innerHTML = grupo('Atrasados', f.atrasados, 'ruim') + grupo('Hoje', f.hoje) + grupo('Próximos 7 dias', f.semana) + grupo('Sem próximo passo', f.semPasso, 'ruim');
}
function alertas() {
  $('#alertas').innerHTML = an.alertas.length
    ? an.alertas.map(x => `<div class="alerta ${x.nivel}"><i>${{ alto: 'alto', medio: 'médio', dado: 'dado' }[x.nivel]}</i>${esc(x.texto)}</div>`).join('')
    : '<p class="dim">Nenhum alerta.</p>';
}

function kanban() {
  $('#kanban').innerHTML = an.etapas.map(e => {
    const ls = dados.leads.filter(l => l.etapa === e);
    const pe = an.porEtapa.find(p => p.etapa === e);
    return `<div class="coluna ${e === 'Ganho' ? 'ganho' : e === 'Perdido' ? 'perdido' : ''}">
      <div class="col-cab"><b>${esc(e)}</b><span>${ls.length} · ${esc(pe.f)}</span></div>
      ${ls.map(l => `<button class="cartao" data-lead="${esc(l.id)}">
        <b>${esc(l.nome)}</b>
        <small>${esc(l.necessidade || 'necessidade não registrada')}</small>
        <span class="rodape">${l.valorPotencial !== '' && l.valorPotencial !== undefined ? esc(din(Number(l.valorPotencial))) : ''}
          ${l.dataProximoPasso ? `<em class="${l.dataProximoPasso < hoje() && !['Ganho', 'Perdido'].includes(l.etapa) ? 'atraso' : ''}">${esc(l.dataProximoPasso)}</em>` : ''}</span>
      </button>`).join('') || '<p class="dim">—</p>'}
    </div>`;
  }).join('');
}

function tabela() {
  const q = ($('#busca').value || '').toLowerCase();
  const ls = dados.leads.filter(l => !q || [l.nome, l.contato, l.origem, l.necessidade].join(' ').toLowerCase().includes(q));
  $('#n-leads').textContent = dados.leads.length;
  $('#t-crm').innerHTML = ls.length ? `<table><tr>${meta.colunas.map(c => `<th>${esc(c[1])}</th>`).join('')}</tr>
    ${ls.map(l => `<tr data-lead="${esc(l.id)}" class="clic">${meta.colunas.map(([k]) => {
      if (k === 'fit') return `<td>${esc(fitTexto(l))}</td>`;
      if (k === 'valorPotencial') return `<td class="r">${l.valorPotencial !== '' && l.valorPotencial !== undefined ? esc(din(Number(l.valorPotencial))) : '<span class="ni">não informado</span>'}</td>`;
      return `<td>${esc(l[k] || '')}</td>`;
    }).join('')}</tr>`).join('')}</table>` : '<p class="dim">Nenhum lead ainda.</p>';
}
function fitTexto(l) {
  const q = l.qualificacao || {};
  const n = meta.criterios.map(([k]) => q[k]).filter(v => v !== '' && v !== undefined);
  if (!n.length) return 'não avaliado';
  const p = n.reduce((s, v) => s + Number(v), 0), r = p / (n.length * 2);
  return `${r >= .8 ? 'alto' : r >= .5 ? 'médio' : 'baixo'} (${p}/${n.length * 2})`;
}
$('#busca').addEventListener('input', tabela);

function analise() {
  $('#conv').innerHTML = `<table><tr><th>De → para</th><th class="r">Entraram</th><th class="r">Avançaram</th><th class="r">Conversão</th></tr>
    ${an.conversao.map(c => `<tr><td>${esc(c.de)} → ${esc(c.para)}</td><td class="r">${c.entraram}</td><td class="r">${c.avancaram}</td><td class="r"><b>${pct(c.taxa)}</b></td></tr>`).join('')}
    <tr><td>Ganho x perdido</td><td class="r">${an.ganhos + an.perdidos}</td><td class="r">${an.ganhos}</td><td class="r"><b>${pct(an.winRate)}</b></td></tr></table>
    <p class="dim">Conta quem chegou a cada etapa pelo histórico de mudanças. Com poucos leads, a taxa oscila muito.</p>`;
  $('#porEtapa').innerHTML = `<table><tr><th>Etapa</th><th class="r">Leads</th><th class="r">Valor informado</th></tr>
    ${an.porEtapa.map(e => `<tr><td>${esc(e.etapa)}</td><td class="r">${e.qtd}</td><td class="r">${esc(e.f)}${e.semValor ? ` <span class="ni">(${e.semValor} sem valor)</span>` : ''}</td></tr>`).join('')}</table>`;
  $('#parados').innerHTML = an.parados.length ? an.parados.map(a => `<button class="item" data-lead="${esc(a.id)}"><b>${esc(a.nome)}</b><span class="tag">${esc(a.etapa)}</span><small>${a.parado} dias sem interação</small></button>`).join('') : '<p class="dim">Nenhum.</p>';
  const lista = (l, vazio) => l.length ? `<table>${l.map(([m, n]) => `<tr><td>${esc(m)}</td><td class="r">${n}</td></tr>`).join('')}</table>` : `<p class="dim">${vazio}</p>`;
  $('#perdas').innerHTML = lista(an.motivosPerda, 'Sem perdas registradas.');
  $('#objecoes').innerHTML = lista(an.objecoes, 'Nenhuma objeção registrada.');
  $('#origens').innerHTML = an.origens.length ? `<table><tr><th>Origem</th><th class="r">Leads</th><th class="r">Ganhos</th><th class="r">Taxa</th></tr>
    ${an.origens.map(o => `<tr><td>${esc(o.origem)}</td><td class="r">${o.leads}</td><td class="r">${o.ganhos}</td><td class="r">${pct(o.taxa)}</td></tr>`).join('')}</table>` : '<p class="dim">Sem leads.</p>';
}

/* ---------- empresa & ICP ---------- */
function formEmpresa() {
  const e = dados.empresa || {};
  $('#f-emp').innerHTML = CAMPOS_EMP.map(([k, rot, tipo, ph]) => {
    const falta = OBRIGATORIOS.includes(k) && !String(e[k] || '').trim() ? ' falta' : '';
    const v = esc(e[k] || '');
    return `<label class="${falta}"><span>${esc(rot)}</span>${tipo === 'area'
      ? `<textarea name="${k}" rows="2" placeholder="${esc(ph || '')}">${v}</textarea>`
      : `<input name="${k}" value="${v}" placeholder="${esc(ph || '')}">`}</label>`;
  }).join('');
}
$('#salvar-emp').addEventListener('click', async e => {
  e.preventDefault();
  const f = new FormData($('#f-emp')), b = {};
  for (const [k] of CAMPOS_EMP) b[k] = String(f.get(k) || '').trim();
  if (b.metaValor) b.metaValor = String(valorBR(b.metaValor));
  await api('api/empresa', { method: 'PUT', body: b });
  toast('Onboarding salvo.'); carregar();
});

/* ===========================================================
   FICHA DO LEAD — CRM padrão + qualificação + formato de resposta
   =========================================================== */
const CAMPOS_LEAD = [
  ['nome', 'Nome / empresa'], ['contato', 'Contato (só o necessário)'], ['origem', 'Origem'],
  ['necessidade', 'Necessidade', 'area'], ['ultimaInteracao', 'Última interação', 'date'],
  ['proximoPasso', 'Próximo passo'], ['dataProximoPasso', 'Data do próximo passo', 'date'],
  ['motivoContato', 'Motivo do contato'], ['valorPotencial', 'Valor potencial informado'],
  ['objecao', 'Objeção (a real, não a desculpa)'], ['observacoes', 'Observações', 'area']
];
const NOTAS = [['', 'não avaliado'], ['0', 'não'], ['1', 'em parte'], ['2', 'sim']];

async function abrirLead(id) {
  aberto = id;
  const { lead, analise: a } = await api('api/leads/' + id);
  $('#g-titulo').textContent = lead.nome;
  $('#g-etapas').innerHTML = an.etapas.map(e => `<button class="etp ${e === lead.etapa ? 'on' : ''} ${e === 'Ganho' ? 'ganho' : e === 'Perdido' ? 'perdido' : ''}" data-etapa="${esc(e)}">${esc(e)}</button>`).join('');
  const q = lead.qualificacao || {};
  $('#f-lead').innerHTML = CAMPOS_LEAD.map(([k, rot, t]) => `<label class="${t === 'area' ? 'largo' : ''}"><span>${esc(rot)}</span>${t === 'area'
      ? `<textarea name="${k}" rows="2">${esc(lead[k] || '')}</textarea>`
      : `<input name="${k}" ${t === 'date' ? 'type="date"' : ''} value="${esc(lead[k] || '')}">`}</label>`).join('') +
    `<fieldset class="largo"><legend>Qualificação</legend>${meta.criterios.map(([k, n, ajuda]) => `
      <label title="${esc(ajuda)}"><span>${esc(n)}</span><select name="q.${k}">${NOTAS.map(([v, t]) =>
        `<option value="${v}" ${String(q[k] ?? '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select><small>${esc(ajuda)}</small></label>`).join('')}
    </fieldset>
    ${lead.etapa === 'Perdido' ? `<label class="largo"><span>Motivo da perda</span><input name="motivoPerda" value="${esc(lead.motivoPerda || '')}"></label>` : ''}
    <div class="acoes largo"><button class="btn prim" id="salvar-lead">Salvar</button><button class="btn perigo" id="excluir-lead" type="button">Excluir lead</button></div>`;

  $('#g-resposta').innerHTML = `
    <div class="fr"><span>Diagnóstico</span>${esc(a.diagnostico)}</div>
    <div class="fr"><span>Etapa do funil</span>${esc(a.etapa)}</div>
    <div class="fr"><span>Próximo objetivo</span>${esc(a.objetivo)}</div>
    ${a.mensagem ? `<div class="fr"><span>Mensagem sugerida <button class="mini" data-copiar="msg">copiar</button></span><pre id="msg">${esc(a.mensagem)}</pre>
      <small class="dim">Revise antes de enviar. Eu não envio nada: quem manda é você.</small></div>` : ''}
    <div class="fr"><span>Próximo passo</span>${esc(a.proximoPasso)}</div>
    <div class="fr"><span>Data recomendada</span>${esc(a.dataRecomendada)}</div>
    <div class="fr risco-${a.risco.split(' ')[0]}"><span>Risco de perda</span>${esc(a.risco)}</div>`;
  $('#prop-saida').innerHTML = '';
  $('#gaveta').hidden = false;
}

document.addEventListener('click', async e => {
  const alvo = e.target.closest('[data-lead]');
  if (alvo) { abrirLead(alvo.dataset.lead); return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.ir) abrirAba(b.dataset.ir);
  if (b.dataset.copiar) {
    try { await navigator.clipboard.writeText($('#' + b.dataset.copiar).textContent); toast('Copiado.'); }
    catch (er) { toast('O navegador não deixou copiar: selecione o texto.'); }
  }
  if (b.dataset.etapa) {
    const para = b.dataset.etapa;
    let motivoPerda = '';
    if (para === 'Perdido') {
      const ok = await confirmar('Marcar como perdido. Qual foi o motivo real?', '<input id="c-motivo" placeholder="ex.: orçamento, prazo, escolheu concorrente, sem resposta">');
      if (!ok) return;
      motivoPerda = ($('#c-motivo').value || '').trim();
      if (!motivoPerda) { toast('Sem motivo a perda não ensina nada: informe um.'); return; }
    }
    try { await api(`api/leads/${aberto}/etapa`, { method: 'POST', body: { para, motivoPerda } }); toast('Etapa: ' + para); carregar(); }
    catch (er) { toast(er.message); }
  }
});
$('#g-fechar').addEventListener('click', () => { $('#gaveta').hidden = true; aberto = null; });
$('#gaveta').addEventListener('click', e => { if (e.target.id === 'gaveta') { $('#gaveta').hidden = true; aberto = null; } });

$('#f-lead').addEventListener('click', async e => {
  if (e.target.id === 'salvar-lead') {
    e.preventDefault();
    const f = new FormData($('#f-lead')), b = { qualificacao: {} };
    for (const [k] of CAMPOS_LEAD) b[k] = String(f.get(k) || '');
    if (f.has('motivoPerda')) b.motivoPerda = f.get('motivoPerda');
    b.valorPotencial = valorBR(b.valorPotencial);
    for (const [k] of meta.criterios) b.qualificacao[k] = f.get('q.' + k);
    await api('api/leads/' + aberto, { method: 'PUT', body: b });
    toast('Lead salvo.'); carregar();
  }
  if (e.target.id === 'excluir-lead') {
    e.preventDefault();
    if (!await confirmar(`Excluir "${$('#g-titulo').textContent}" do CRM? Isso não dá para desfazer.`)) return;
    await api(`api/leads/${aberto}?confirmar=sim`, { method: 'DELETE' });
    $('#gaveta').hidden = true; aberto = null; toast('Lead excluído.'); carregar();
  }
});

$('#gerar-prop').addEventListener('click', async () => {
  const f = new FormData($('#f-prop')), b = {};
  for (const k of ['solucao', 'escopo', 'pagamento', 'prazo', 'validade']) b[k] = String(f.get(k) || '');
  b.valor = valorBR(f.get('valor'));
  const r = await api('api/proposta/' + aberto, { method: 'POST', body: b });
  $('#prop-saida').innerHTML = (r.faltam.length ? `<div class="alerta medio"><i>falta</i>Antes de enviar, informe: ${esc(r.faltam.join(', '))}.</div>` : '') +
    `<div class="fr"><span>Texto <button class="mini" data-copiar="prop-txt">copiar</button></span><pre id="prop-txt">${esc(r.texto)}</pre></div>`;
});

$('#novo-lead').addEventListener('click', async () => {
  const ok = await confirmar('Novo lead', '<input id="c-nome" placeholder="Nome / empresa"><input id="c-origem" placeholder="Origem (ex.: indicação, Instagram, site)">');
  if (!ok) return;
  const nome = ($('#c-nome').value || '').trim();
  if (!nome) { toast('Informe o nome.'); return; }
  const { lead } = await api('api/leads', { method: 'POST', body: { nome, origem: $('#c-origem').value, ultimaInteracao: hoje() } });
  await carregar(); abrirLead(lead.id);
});

/* importação em duas etapas: mostra o que vai entrar e só grava com confirmação */
$('#csv').addEventListener('change', async e => {
  const arq = e.target.files[0]; if (!arq) return;
  const csv = await arq.text(); e.target.value = '';
  const p = await api('api/importar', { method: 'POST', body: { csv } });
  if (!p.total) { $('#imp').innerHTML = `Nada para importar. ${esc((p.erros || []).join('; '))}`; return; }
  const ok = await confirmar(`Importar ${p.total} lead(s)?`, `<p class="dim">Primeiros: ${esc(p.previa.join(', '))}${p.erros.length ? `<br>${p.erros.length} linha(s) recusada(s): ${esc(p.erros.slice(0, 5).join('; '))}` : ''}</p>`);
  if (!ok) return;
  const r = await api('api/importar', { method: 'POST', body: { csv, confirmar: true } });
  $('#imp').textContent = `${r.importados} lead(s) importado(s).`;
  carregar();
});

function abrirAba(id) {
  $$('#abas button').forEach(b => b.classList.toggle('on', b.dataset.aba === id));
  $$('.aba').forEach(s => s.classList.toggle('on', s.id === 'aba-' + id));
}
$('#abas').addEventListener('click', e => { if (e.target.dataset.aba) abrirAba(e.target.dataset.aba); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#gaveta').hidden = true; aberto = null; } });

carregar();
})();
