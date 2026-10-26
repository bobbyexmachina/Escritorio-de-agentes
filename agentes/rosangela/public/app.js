/* ===========================================================
   Painel da Rosângela Maria — a tela. Os cálculos moram no servidor
   (calc.js); aqui só se edita os dados e se mostra o que voltou.
   =========================================================== */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CLASSES = [
  ['receita', 'Receita'], ['imposto', 'Imposto sobre venda'], ['custo_variavel', 'Custo variável'],
  ['custo_fixo', 'Custo fixo'], ['despesa', 'Despesa'], ['investimento', 'Investimento'],
  ['outra_entrada', 'Outra entrada'], ['outra_saida', 'Outra saída']
];
const nomeClasse = k => (CLASSES.find(c => c[0] === k) || [k, k])[1];
const ENTRADAS = new Set(['receita', 'outra_entrada']);

/* campos do onboarding: o que o descritivo manda descobrir */
const CAMPOS = [
  ['nome', 'Nome da empresa', 'text'],
  ['nicho', 'Nicho / mercado', 'text', 'ex.: produtora de vídeo institucional e publicitário'],
  ['modeloReceita', 'Modelo de receita', 'text', 'ex.: por projeto, contrato mensal, diária'],
  ['produtos', 'Produtos e serviços', 'area'],
  ['moeda', 'Moeda', 'text', 'BRL'],
  ['periodoInicio', 'Início do período analisado', 'date'],
  ['saldoInicial', 'Saldo de caixa nessa data', 'num'],
  ['fontesReceita', 'Fontes de receita', 'area'],
  ['custosFixos', 'Principais custos fixos', 'area'],
  ['custosVariaveis', 'Principais custos variáveis', 'area'],
  ['registroAtual', 'Como registra os números hoje', 'text', 'ex.: planilha, sistema, extrato'],
  ['metaReceita', 'Meta de receita mensal', 'num'],
  ['metaMargem', 'Meta de margem de contribuição (%)', 'num'],
  ['caixaMinimo', 'Caixa mínimo de segurança', 'num'],
  ['metas', 'Outras metas', 'area'],
  ['indicadores', 'Indicadores que já acompanha', 'area']
];

let dados = null, analise = null, mesSel = '';

/* ---------- números no formato brasileiro ---------- */
function valorBR(v) {
  v = String(v || '').replace(/[^\d,.-]/g, '');
  if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.');
  else v = v.replace(/,/g, '');
  return Number(v);
}
const moeda = () => (dados && dados.empresa && dados.empresa.moeda) || '';
function din(v) {
  if (v === null || v === undefined || v === '' || !isFinite(v)) return 'não informado';
  try { if (moeda()) return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: moeda() }); } catch (e) { /* moeda inválida */ }
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- servidor ---------- */
async function carregar() {
  dados = await (await fetch('api/dados')).json();
  await recalcular();
}
async function salvar(msg) {
  const r = await fetch('api/dados', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
  if (!r.ok) { toast('Não consegui salvar: ' + ((await r.json()).motivo || r.status)); return; }
  dados = await (await fetch('api/dados')).json();
  await recalcular();
  if (msg) toast(msg);
}
async function recalcular() {
  analise = await (await fetch('api/analise' + (mesSel ? '?mes=' + mesSel : ''))).json();
  if (!mesSel) mesSel = analise.mes;
  desenhar();
}

function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600);
}

/* ===========================================================
   DESENHO
   =========================================================== */
function desenhar() {
  // seletor de mês
  const meses = analise.mesesDisponiveis.length ? analise.mesesDisponiveis : [analise.mes];
  if (!meses.includes(analise.mes)) meses.push(analise.mes);
  $('#mes').innerHTML = meses.sort().reverse().map(m => `<option ${m === analise.mes ? 'selected' : ''}>${m}</option>`).join('');

  // categorias já usadas, para o autocompletar
  const cats = [...new Set(dados.lancamentos.map(l => l.categoria).filter(Boolean))].sort();
  $('#cats').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');

  boasVindas(); kpis(); alertas(); caixa(); cards('#resultado', [...analise.resultado, ...analise.margem]);
  cards('#unit', analise.unit); orcPainel();
  formEmpresa(); tabelaLanc(); tabelaOrc(); tabelaOp(); cenarios(); relatorio();
}

/* primeira resposta: apresentação + as perguntas mínimas para o Painel Inicial */
function boasVindas() {
  const falta = analise.onboarding;
  const semLanc = !dados.lancamentos.length;
  if (!falta.length && !semLanc) { $('#boasvindas').innerHTML = ''; return; }
  const essenciais = falta.filter(f => ['moeda', 'periodoInicio', 'saldoInicial', 'modeloReceita', 'custosFixos', 'metas'].includes(f.campo));
  $('#boasvindas').innerHTML = `
    <div class="ola">
      <div class="foto grande">RM</div>
      <div>
        <h2>Olá, eu sou a Rosângela Maria, responsável por Financeiro &amp; Performance.</h2>
        <p>Organizo os números da empresa para apoiar a gestão: caixa, resultado, margem, unit economics, orçamento, alertas e cenários. Trabalho só com o que você me informar — o que faltar, eu aviso.</p>
        ${falta.length ? `<p><b>Para montar o Painel Inicial, preciso saber:</b></p>
        <ol>${(essenciais.length ? essenciais : falta).slice(0, 6).map(f => `<li>${esc(f.pergunta)}</li>`).join('')}</ol>` : ''}
        ${semLanc ? '<p>E dos <b>lançamentos</b> do período: pode digitar na aba Lançamentos ou importar a planilha (há um modelo para baixar).</p>' : ''}
        <div class="acoes">
          ${falta.length ? '<button class="btn prim" data-ir="empresa">Responder agora</button>' : ''}
          ${semLanc ? '<button class="btn" data-ir="lancamentos">Lançar números</button>' : ''}
        </div>
      </div>
    </div>`;
}

function kpis() {
  $('#kpis').innerHTML = analise.painel.map(p => `
    <div class="kpi ${p.sinal}">
      <span>${esc(p.kpi)}</span>
      <b>${esc(p.valor)}</b>
      ${p.meta ? `<small>${esc(p.meta)}</small>` : ''}
    </div>`).join('');
}

function alertas() {
  const a = analise.alertas;
  $('#alertas').innerHTML = a.length ? a.map(x => `
    <div class="alerta ${x.nivel}"><i>${{ alto: 'alto', medio: 'médio', dado: 'dado' }[x.nivel]}</i>${esc(x.texto)}</div>`).join('')
    : `<p class="dim">${analise.temDados ? 'Nenhum alerta em ' + analise.mes + '.' : 'Sem lançamentos no mês para verificar.'}</p>`;
}

function cardHTML(c) {
  return `<div class="calc ${c.completo ? '' : 'incompleto'}">
    <h3>${esc(c.titulo)}</h3>
    <b class="res">${esc(c.resultado)}</b>
    <div class="formula"><span>Fórmula</span>${esc(c.formula)}</div>
    <ul class="entradas">${c.entradas.map(e => `<li><span>${esc(e.nome)}</span><em class="${e.valor === 'não informado' ? 'ni' : ''}">${esc(e.valor)}</em></li>`).join('')}</ul>
    <p class="leitura">${esc(c.interpretacao)}</p>
  </div>`;
}
const cards = (sel, lista) => { $(sel).innerHTML = lista.map(cardHTML).join(''); };

function caixa() {
  const c = analise.caixa;
  const proj = c.projecao.length ? `
    <h3 class="sub">Projeção — saldo de hoje + o que está lançado como previsto</h3>
    <table><tr><th>Mês</th><th>Entradas previstas</th><th>Saídas previstas</th><th>Saldo projetado</th></tr>
    ${c.projecao.map(p => `<tr class="${p.saldoProjetado < 0 ? 'neg' : ''}"><td>${p.mes}</td><td>${p.f.e}</td><td>${p.f.s}</td><td><b>${p.f.saldo}</b></td></tr>`).join('')}</table>
    <p class="dim">Só entra o que você lançou como <b>previsto</b>. Mês sem previsto não significa mês sem gasto.</p>`
    : '<p class="dim">Projeção indisponível: informe o saldo inicial na aba Empresa.</p>';
  const hist = c.historico.length ? `
    <h3 class="sub">Realizado por mês</h3>
    <table><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Líquido</th></tr>
    ${c.historico.slice(-6).reverse().map(h => `<tr><td>${h.mes}</td><td>${h.f.e}</td><td>${h.f.s}</td><td>${h.f.liq}</td></tr>`).join('')}</table>` : '';
  $('#caixa').innerHTML = `<div class="cards dois">${c.calculos.map(cardHTML).join('')}</div>${proj}${hist}`;
}

function orcPainel() {
  const o = analise.orcamento;
  $('#orc-painel').innerHTML = o.length ? `
    <table><tr><th>Categoria</th><th>Classe</th><th>Planejado</th><th>Realizado</th><th>Desvio</th><th>%</th></tr>
    ${o.map(x => `<tr class="${x.ruim && Math.abs(x.desvioPct || 0) > .1 ? 'neg' : ''}"><td>${esc(x.categoria)}</td><td>${nomeClasse(x.classe)}</td>
      <td>${x.f.planejado}</td><td>${x.f.realizado}</td><td>${x.f.desvio}</td><td>${x.f.desvioPct}</td></tr>`).join('')}</table>
    <p class="dim">Desvio = realizado − planejado. Em linha vermelha, desvio desfavorável acima de 10%.</p>`
    : `<p class="dim">Sem orçamento para ${analise.mes}. Planeje na aba Orçamento.</p>`;
}

/* ---------- empresa ---------- */
function formEmpresa() {
  const e = dados.empresa || {};
  const falta = new Set(analise.onboarding.map(f => f.campo));
  $('#f-empresa').innerHTML = CAMPOS.map(([k, rot, tipo, ph]) => {
    const v = esc(e[k] || '');
    const marca = falta.has(k) ? ' falta' : '';
    const campo = tipo === 'area' ? `<textarea name="${k}" rows="2" placeholder="${esc(ph || '')}">${v}</textarea>`
      : `<input name="${k}" type="${tipo === 'date' ? 'date' : 'text'}" ${tipo === 'num' ? 'inputmode="decimal"' : ''} value="${v}" placeholder="${esc(ph || '')}">`;
    return `<label class="${marca}"><span>${esc(rot)}</span>${campo}</label>`;
  }).join('');
}
$('#salvar-empresa').addEventListener('click', async e => {
  e.preventDefault();
  const f = new FormData($('#f-empresa'));
  dados.empresa = dados.empresa || {};
  for (const [k, , tipo] of CAMPOS) {
    let v = String(f.get(k) || '').trim();
    if (tipo === 'num' && v) v = String(valorBR(v));
    dados.empresa[k] = v;
  }
  await salvar('Dados da empresa salvos.');
});

/* ---------- lançamentos ---------- */
const opcoesClasse = () => CLASSES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
$('#f-lanc [name=classe]').innerHTML = opcoesClasse();
$('#f-orc [name=classe]').innerHTML = opcoesClasse();
$('#f-lanc [name=data]').value = new Date().toISOString().slice(0, 10);

$('#f-lanc').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const valor = valorBR(f.get('valor'));
  if (!(valor > 0)) { toast('Valor precisa ser maior que zero.'); return; }
  dados.lancamentos.push({ data: f.get('data'), descricao: f.get('descricao'), classe: f.get('classe'),
    categoria: f.get('categoria'), valor, cliente: f.get('cliente'), status: f.get('status') });
  e.target.descricao.value = ''; e.target.valor.value = ''; e.target.cliente.value = '';
  await salvar('Lançamento adicionado.');
});

function tabelaLanc() {
  const q = ($('#busca').value || '').toLowerCase();
  const lista = dados.lancamentos
    .filter(l => !q || [l.descricao, l.categoria, l.cliente].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const ruins = new Set(analise.inconsistencias.map(i => i.id));
  $('#n-lanc').textContent = dados.lancamentos.length;
  $('#t-lanc').innerHTML = lista.length ? `<table>
    <tr><th>Data</th><th>Descrição</th><th>Classe</th><th>Categoria</th><th>Cliente/projeto</th><th>Status</th><th class="r">Valor</th><th></th></tr>
    ${lista.slice(0, 500).map(l => `<tr class="${ruins.has(l.id) ? 'aviso-linha' : ''} ${l.status}">
      <td>${esc(l.data)}</td><td>${esc(l.descricao)}</td><td>${nomeClasse(l.classe)}</td><td>${esc(l.categoria)}</td>
      <td>${esc(l.cliente)}</td><td>${l.status}</td>
      <td class="r ${ENTRADAS.has(l.classe) ? 'pos' : 'neg-t'}">${ENTRADAS.has(l.classe) ? '+' : '−'} ${din(l.valor)}</td>
      <td><button class="x" data-del-lanc="${esc(l.id)}" title="Excluir">✕</button></td></tr>`).join('')}
  </table>${lista.length > 500 ? '<p class="dim">Mostrando os 500 mais recentes. Use o filtro.</p>' : ''}`
    : '<p class="dim">Nenhum lançamento ainda.</p>';
}
$('#busca').addEventListener('input', tabelaLanc);

$('#csv').addEventListener('change', async e => {
  const arq = e.target.files[0]; if (!arq) return;
  const csv = await arq.text();
  const r = await (await fetch('api/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv }) })).json();
  $('#imp-msg').innerHTML = `${r.importados} lançamento(s) importado(s).` +
    (r.erros && r.erros.length ? ` <b>${r.erros.length} linha(s) recusada(s):</b> ${esc(r.erros.slice(0, 8).join('; '))}` : '');
  e.target.value = '';
  await carregar();
});

/* ---------- orçamento ---------- */
$('#f-orc').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const valor = valorBR(f.get('valor'));
  if (!(valor >= 0)) { toast('Valor inválido.'); return; }
  dados.orcamento.push({ mes: f.get('mes'), classe: f.get('classe'), categoria: f.get('categoria'), valor });
  e.target.categoria.value = ''; e.target.valor.value = '';
  await salvar('Linha de orçamento adicionada.');
});
function tabelaOrc() {
  const l = [...dados.orcamento].sort((a, b) => b.mes.localeCompare(a.mes));
  $('#t-orc').innerHTML = l.length ? `<table><tr><th>Mês</th><th>Classe</th><th>Categoria</th><th class="r">Planejado</th><th></th></tr>
    ${l.map(o => `<tr><td>${esc(o.mes)}</td><td>${nomeClasse(o.classe)}</td><td>${esc(o.categoria)}</td><td class="r">${din(o.valor)}</td>
      <td><button class="x" data-del-orc="${esc(o.id)}">✕</button></td></tr>`).join('')}</table>`
    : '<p class="dim">Nenhum orçamento ainda.</p>';
}

/* ---------- operação ---------- */
function tabelaOp() {
  const l = [...dados.operacao].sort((a, b) => b.mes.localeCompare(a.mes));
  $('#t-op').innerHTML = l.length ? `<table><tr><th>Mês</th><th>Nº de vendas / projetos</th><th>Clientes novos</th><th>Investimento em aquisição</th><th></th></tr>
    ${l.map(o => `<tr data-mes="${esc(o.mes)}"><td>${esc(o.mes)}</td>
      <td><input data-op="vendas" value="${esc(o.vendas)}" inputmode="numeric" placeholder="não informado"></td>
      <td><input data-op="clientesNovos" value="${esc(o.clientesNovos)}" inputmode="numeric" placeholder="não informado"></td>
      <td><input data-op="investimentoAquisicao" value="${esc(o.investimentoAquisicao)}" inputmode="decimal" placeholder="não informado"></td>
      <td><button class="x" data-del-op="${esc(o.mes)}">✕</button></td></tr>`).join('')}</table>`
    : '<p class="dim">Nenhum mês ainda.</p>';
  $('#op-mes').value = $('#op-mes').value || mesSel;
}
$('#t-op').addEventListener('change', async e => {
  const k = e.target.dataset.op; if (!k) return;
  const mes = e.target.closest('tr').dataset.mes;
  const o = dados.operacao.find(o => o.mes === mes);
  const v = e.target.value.trim();
  o[k] = v === '' ? '' : String(k === 'investimentoAquisicao' ? valorBR(v) : Number(v.replace(/\D/g, '')));
  await salvar('Operação atualizada.');
});
$('#op-add').addEventListener('click', async () => {
  const m = $('#op-mes').value;
  if (!m) return;
  if (dados.operacao.some(o => o.mes === m)) { toast('Esse mês já está na lista.'); return; }
  dados.operacao.push({ mes: m, vendas: '', clientesNovos: '', investimentoAquisicao: '' });
  await salvar();
});

/* exclusões */
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.delLanc) { dados.lancamentos = dados.lancamentos.filter(l => l.id !== b.dataset.delLanc); await salvar('Lançamento excluído.'); }
  if (b.dataset.delOrc)  { dados.orcamento = dados.orcamento.filter(o => o.id !== b.dataset.delOrc); await salvar('Linha excluída.'); }
  if (b.dataset.delOp)   { dados.operacao = dados.operacao.filter(o => o.mes !== b.dataset.delOp); await salvar('Mês excluído.'); }
  if (b.dataset.ir) abrirAba(b.dataset.ir);
});

/* ---------- cenários ---------- */
function cenarios() {
  const H = Object.assign({ meses: 6, conservador: { receita: -10, custos: 5 }, base: { receita: 0, custos: 0 }, agressivo: { receita: 10, custos: 5 } }, dados.cenarios || {});
  $('#f-cen').innerHTML = `<label class="meses"><span>Horizonte (meses)</span><input name="meses" value="${H.meses}" inputmode="numeric"></label>` +
    ['conservador', 'base', 'agressivo'].map(k => `
    <fieldset><legend>${k}</legend>
      <label><span>Receita (% sobre a média)</span><input name="${k}.receita" value="${H[k].receita}" inputmode="decimal"></label>
      <label><span>Custos fixos + despesas (%)</span><input name="${k}.custos" value="${H[k].custos}" inputmode="decimal"></label>
    </fieldset>`).join('');
  const c = analise.cenarios;
  $('#cenarios').innerHTML = !c ? '<p class="dim">Preciso de pelo menos um mês com lançamentos realizados.</p>' : `
    <div class="fato"><b>FATO</b> ${c.fato.map(esc).join(' ')}</div>
    <div class="cards">${c.lista.map(x => `<div class="calc cen-${x.nome}">
      <h3>${x.nome.toUpperCase()}</h3>
      <div class="formula"><span>HIPÓTESE</span>${esc(x.hipotese)}</div>
      <div class="formula"><span>CÁLCULO</span>${esc(x.calculo)}</div>
      <ul class="entradas">
        <li><span>Receita / mês</span><em>${x.f.receita}</em></li>
        <li><span>Resultado / mês</span><em>${x.f.resultado}</em></li>
        <li><span>Acumulado em ${c.meses} meses</span><em>${x.f.acumulado}</em></li>
        <li><span>Caixa ao final</span><em>${x.f.caixa}</em></li>
      </ul></div>`).join('')}</div>`;
}
$('#salvar-cen').addEventListener('click', async e => {
  e.preventDefault();
  const f = new FormData($('#f-cen'));
  const n = k => Number(String(f.get(k) || '0').replace(',', '.')) || 0;
  dados.cenarios = { meses: n('meses') || 6,
    conservador: { receita: n('conservador.receita'), custos: n('conservador.custos') },
    base: { receita: n('base.receita'), custos: n('base.custos') },
    agressivo: { receita: n('agressivo.receita'), custos: n('agressivo.custos') } };
  await salvar('Cenários recalculados.');
});

/* ---------- relatório ---------- */
let textoRel = '';
async function relatorio() {
  textoRel = await (await fetch('api/relatorio' + (mesSel ? '?mes=' + mesSel : ''))).text();
  $('#relatorio').innerHTML = md(textoRel);
  $('#baixar').href = URL.createObjectURL(new Blob([textoRel], { type: 'text/markdown' }));
  $('#baixar').download = `relatorio-financeiro-${analise.mes}.md`;
}
/** markdown mínimo: títulos, listas aninhadas, citação e negrito */
function md(t) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  let html = '', lista = 0;
  const fecha = (ate) => { while (lista > ate) { html += '</ul>'; lista--; } };
  for (const l of t.split('\n')) {
    const li = l.match(/^(\s*)- (.*)$/);
    if (li) {
      const nivel = li[1].length >= 2 ? 2 : 1;
      while (lista < nivel) { html += '<ul>'; lista++; }
      fecha(nivel);
      html += `<li>${inl(li[2])}</li>`; continue;
    }
    fecha(0);
    if (/^### /.test(l)) html += `<h4>${inl(l.slice(4))}</h4>`;
    else if (/^## /.test(l)) html += `<h3>${inl(l.slice(3))}</h3>`;
    else if (/^# /.test(l)) html += `<h2>${inl(l.slice(2))}</h2>`;
    else if (/^> /.test(l)) html += `<blockquote>${inl(l.slice(2))}</blockquote>`;
    else if (l.trim()) html += `<p>${inl(l)}</p>`;
  }
  fecha(0);
  return html;
}
$('#copiar').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(textoRel); toast('Relatório copiado.'); }
  catch (e) { toast('O navegador não deixou copiar: use Baixar .md.'); }
});

/* ---------- abas e mês ---------- */
function abrirAba(id) {
  $$('#abas button').forEach(b => b.classList.toggle('on', b.dataset.aba === id));
  $$('.aba').forEach(s => s.classList.toggle('on', s.id === 'aba-' + id));
  try { localStorage.setItem('rosangela-aba', id); } catch (e) { /* sem storage */ }
}
$('#abas').addEventListener('click', e => { if (e.target.dataset.aba) abrirAba(e.target.dataset.aba); });
$('#mes').addEventListener('change', e => { mesSel = e.target.value; recalcular(); });
try { const a = localStorage.getItem('rosangela-aba'); if (a && $('#aba-' + a)) abrirAba(a); } catch (e) { /* sem storage */ }

carregar();
})();
