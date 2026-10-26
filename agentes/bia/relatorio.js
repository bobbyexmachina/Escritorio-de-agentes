#!/usr/bin/env node
/* ===========================================================
   relatorio.js — o atendimento da Bia pela linha de comando.

     node relatorio.js                 fila, feedback por tema e alertas
     node relatorio.js triar "texto"   triagem sugerida de uma mensagem
     node relatorio.js caso <cliente>  um caso no formato padrão
     node relatorio.js --json          a análise completa em JSON

   Lê data/atendimento.json (o mesmo arquivo do painel). Só lê: não grava nada.
   =========================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./regras');

let dados = { faq: [], casos: [] };
try { dados = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'atendimento.json'), 'utf8')); }
catch (e) { console.error('Ainda não há data/atendimento.json: preencha a Configuração no painel.'); }

const [cmd, ...resto] = process.argv.slice(2);
if (cmd === '--json') console.log(JSON.stringify(R.analisar(dados), null, 2));
else if (cmd === 'triar') console.log(JSON.stringify(R.triar(resto.join(' '), dados.faq), null, 2));
else if (cmd === 'caso') {
  const q = resto.join(' ').toLowerCase();
  const achados = (dados.casos || []).filter(c => String(c.cliente || '').toLowerCase().includes(q));
  console.log(achados.length ? achados.map(R.casoTexto).join('\n\n---\n\n') : `Nenhum caso com "${q}".`);
} else console.log(R.resumo(dados));
