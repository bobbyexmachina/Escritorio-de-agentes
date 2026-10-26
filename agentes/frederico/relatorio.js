#!/usr/bin/env node
/* ===========================================================
   relatorio.js — o pipeline do Frederico pela linha de comando.

     node relatorio.js              pipeline, conversão, follow-ups, perdas
     node relatorio.js lead Acme    um lead no formato de resposta
     node relatorio.js --json       a análise completa em JSON

   Lê data/crm.json (o mesmo arquivo do painel). Só lê: não grava nada.
   =========================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./regras');

let dados = { empresa: {}, leads: [] };
try { dados = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'crm.json'), 'utf8')); }
catch (e) { console.error('Ainda não há data/crm.json: preencha a aba Empresa & ICP no painel.'); }

const args = process.argv.slice(2);
if (args[0] === 'lead') {
  const q = args.slice(1).join(' ').toLowerCase();
  const achados = (dados.leads || []).filter(l => String(l.nome).toLowerCase().includes(q));
  if (!achados.length) console.log(`Nenhum lead com "${q}".`);
  for (const l of achados) console.log(R.leadTexto(l, dados.empresa) + '\n');
} else if (args.includes('--json')) console.log(JSON.stringify(R.analisar(dados), null, 2));
else console.log(R.resumo(dados));
