#!/usr/bin/env node
/* ===========================================================
   relatorio.js — o marketing da Duda pela linha de comando.

     node relatorio.js            Mapa de Comunicação completo
     node relatorio.js conferir   peças com alegação para confirmar
     node relatorio.js --json     a análise completa em JSON

   Lê data/marketing.json (o mesmo arquivo do painel). Só lê: não grava nada.
   =========================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./regras');

let dados = {};
try { dados = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'marketing.json'), 'utf8')); }
catch (e) { console.error('Ainda não há data/marketing.json: preencha o Mapa de Comunicação no painel.'); }

const arg = process.argv[2];
if (arg === '--json') console.log(JSON.stringify(R.analisar(dados), null, 2));
else if (arg === 'conferir') {
  const a = R.analisar(dados);
  const pecas = [...a.criativos.map(c => ['criativo', c.titulo || c.hook || c.ideia, c.alertas]),
                 ...a.conteudos.map(c => ['conteúdo', `${c.data} ${c.assunto || c.gancho || ''}`, c.alertas]),
                 ...a.copys.map(c => ['copy', String(c.texto).slice(0, 60), c.alertas])].filter(p => p[2].length);
  console.log(pecas.length ? pecas.map(([t, n, al]) => `- ${t}: ${n}\n  ${al.join('; ')}`).join('\n') : 'Nenhuma alegação para confirmar.');
} else console.log(R.mapa(dados));
