#!/usr/bin/env node
/* ===========================================================
   relatorio.js — o relatório no formato padrão, pela linha de comando.

     node relatorio.js            mês mais recente com lançamentos
     node relatorio.js 2026-09    um mês específico
     node relatorio.js --json     a análise completa em JSON

   Lê data/financeiro.json (o mesmo arquivo do painel). Só lê: não grava nada.
   =========================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { analisar, relatorio } = require('./calc');

let dados = {};
try { dados = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'financeiro.json'), 'utf8')); }
catch (e) { console.error('Ainda não há data/financeiro.json: preencha a aba Empresa no painel.'); }

const args = process.argv.slice(2);
const mes = args.find(a => /^\d{4}-\d{2}$/.test(a));
if (args.includes('--json')) console.log(JSON.stringify(analisar(dados, mes), null, 2));
else console.log(relatorio(dados, mes));
