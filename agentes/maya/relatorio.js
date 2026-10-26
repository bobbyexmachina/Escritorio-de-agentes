#!/usr/bin/env node
/* ===========================================================
   relatorio.js — a operação da Maya pela linha de comando.

     node relatorio.js            entrega no formato padrão
     node relatorio.js resumo     resumo executivo (decidido, pendências, próximos passos)
     node relatorio.js sops       todos os SOPs como checklist
     node relatorio.js --json     a análise completa em JSON

   Lê data/operacao.json (o mesmo arquivo do painel). Só lê: não grava nada.
   =========================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./regras');

let dados = {};
try { dados = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'operacao.json'), 'utf8')); }
catch (e) { console.error('Ainda não há data/operacao.json: preencha o Mapa da Operação no painel.'); }

const arg = process.argv[2];
if (arg === '--json') console.log(JSON.stringify(R.analisar(dados), null, 2));
else if (arg === 'resumo') console.log(R.resumoExecutivo(dados));
else if (arg === 'sops') console.log((dados.sops || []).map(R.sopTexto).join('\n\n---\n\n') || 'Nenhum SOP ainda.');
else console.log(R.entrega(dados));
