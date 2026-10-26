/* ===========================================================
   furniture.js — móveis, estações de trabalho e pontos de lazer

   Convenção de altura (px acima do piso):
     0 .. 25   estrutura da mesa
     28        tampo  (tudo que fica "em cima da mesa" nasce aqui)
     28 .. 62  monitor
     9 .. 15   assento da cadeira  (bate com AVATAR.SEAT = 15)
   =========================================================== */
const FURN = (() => {

  const items = [];
  const workSlots = [];
  const restSlots = [];
  const meetSlots = [];

  const TOP  = 28;          // tampo da mesa
  const S    = ISO.toScreen;
  const add  = (o) => { items.push(o); return o; };

  function block(x, y, w, d) {
    for (let i = Math.floor(x); i < Math.ceil(x + w); i++)
      for (let j = Math.floor(y); j < Math.ceil(y + d); j++)
        WORLD.setBlocked(i, j, 1);
  }

  /** cadeira no lugar do boneco, em duas camadas para ele sentar DENTRO dela.
      A pegada acompanha a escala do boneco: se a cadeira ficasse menor que
      ele, o corpo sobraria para fora do encosto.                          */
  function cadeira(seat, tipo, hue) {
    const L = 1.05 * AVATAR.SCALE;                   // lado da pegada, em tiles
    const comum = { x: seat.x - L / 2, y: seat.y - L / 2, w: L, d: L,
                    face: seat.facing, hue: hue || 200 };
    // o boneco é desenhado em (seat.x + seat.y + 0.5)
    add(Object.assign({ t: tipo, camada: 'tras',   dk: seat.x + seat.y - 0.25 }, comum));
    return add(Object.assign({ t: tipo, camada: 'frente', dk: seat.x + seat.y + 0.75 }, comum));
  }

  /* ===========================================================
     LAYOUT
     =========================================================== */
  const R = WORLD.ROOMS;
  const bloco = (o) => { block(o.x, o.y, o.w || 1, o.d || 1); return o; };
  const solto = (o) => bloco(add(o));

  /* ---------- estação de trabalho ----------
     O boneco senta de costas para a câmera: vemos a tela dele, e cada
     departamento mostra no monitor o próprio trabalho (timeline na
     edição, rodas de cor na correção, quadros-chave na animação…).   */
  let nEst = 0;
  function estacao(room, pref, x, y, v) {
    const r = R[room];
    const conta = workSlots.filter(s => s.room === room).length + 1;
    const id = pref + '-' + String(conta).padStart(2, '0');
    nEst++;
    const mesa = add({ t: 'deskStudio', id, x, y, w: 3, d: 1.3, face: 'n', busy: false,
                       v, cor: r.accent, sabor: nEst });
    block(x, y, 3, 1.3);
    const seat = { x: x + 1.5, y: y + 2.0, facing: 'n' };
    cadeira(seat, 'chairStudio', r.accent);
    workSlots.push({ id, room, label: r.short + ' · estação ' + conta,
                     x: seat.x, y: seat.y, facing: 'n', obj: mesa });
  }

  /** lugar de descanso */
  const descanso = (id, label, x, y, facing, act, obj, sit) =>
    restSlots.push({ id, label, x, y, facing, act, obj, sit: !!sit });

  /* ---------- DIRETORIA ---------- */
  const seatA = { x: 4.5, y: 4.0, facing: 's' };
  const mesaA = add({ t: 'deskBoss', id: 'DIR-1', x: 2.4, y: 4.7, w: 4.2, d: 1.6,
                      face: 's', busy: false, cor: WORLD.C.marca, controle: true });
  block(2.4, 4.7, 4.2, 1.6);
  cadeira(seatA, 'chairBoss');
  workSlots.push({ id: 'DIR-1', room: 'diretoria', label: 'Mesa do sócio',
                   x: seatA.x, y: seatA.y, facing: 's', obj: mesaA, vip: true });

  estacao('diretoria', 'OPS', 8.6, 5.4, 'fun');                       // operações, ao lado do sócio
  add({ t: 'rug', x: 1.8, y: 8.4, w: 5.8, d: 3.6, c: '#4a3628' });
  solto({ t: 'sofa', x: 2.2, y: 8.8, w: 4.6, d: 1.4, dir: 'n', c: '#6d6964' });
  solto({ t: 'lowTable', x: 3.5, y: 10.7, w: 2, d: 1 });
  solto({ t: 'premios', x: 12.6, y: 5.6, w: 1.2, d: 3.8 });
  solto({ t: 'cameraCine', x: 9.8, y: 2.0 });
  solto({ t: 'plant', x: 13.2, y: 1.3, k: 2 });
  solto({ t: 'plant', x: 13.2, y: 11.2, k: 2 });

  /* ---------- SALA DE REUNIÕES ---------- */
  const mtable = add({ t: 'meetTable', x: 18.5, y: 5, w: 7, d: 3.2 });
  block(18.5, 5, 7, 3.2);
  [20, 22, 24].forEach((x, i) => {
    const s = { id: 'MT' + i, x, y: 4.2, facing: 's', sit: true, obj: mtable };
    meetSlots.push(s); cadeira(s, 'chairSimple');
  });
  [20, 22, 24].forEach((x, i) => {
    const s = { id: 'MB' + i, x, y: 8.9, facing: 'n', sit: true, obj: mtable };
    meetSlots.push(s); cadeira(s, 'chairSimple');
  });
  [{ id: 'ML', x: 17.7, y: 6.6, facing: 'e' }, { id: 'MR', x: 26.3, y: 6.6, facing: 'w' }]
    .forEach(p => {
      const s = Object.assign({ sit: true, obj: mtable }, p);
      meetSlots.push(s); cadeira(s, 'chairSimple');
    });
  add({ t: 'tvWall', x: 19.5, y: 1.15, w: 5, d: 0.5, meeting: true });
  solto({ t: 'plant', x: 26.4, y: 1.3, k: 2 });
  solto({ t: 'plant', x: 16.3, y: 11.3, k: 2 });

  /* ---------- SALA DE EXIBIÇÃO ----------
     Três fileiras viradas para a tela, corredor no meio, alinhado com a
     porta. A poltrona é pintada DEPOIS de quem senta: o encosto tapa as
     costas do boneco, como no cinema de verdade.                       */
  let nPol = 0;
  [4.6, 7.0, 9.4].forEach(fy => {
    [30.6, 32.0, 33.4, 34.8, 38.2, 39.6, 41.0, 42.4].forEach(cx => {
      const sy = fy + 0.55;
      const o = add({ t: 'poltrona', x: cx - .6, y: fy, w: 1.2, d: 1.1,
                      dk: cx + sy + 0.75 });
      block(cx - .6, fy, 1.2, 1.1);
      // só a fileira do meio vira descanso: senão o cinema engoliria a pausa de todo mundo
      if (fy === 7.0) descanso('CIN' + (nPol++), 'cinema', cx, sy, 'n', 'assistindo ao corte final', o, true);
    });
  });
  solto({ t: 'caixaSom', x: 29.1, y: 1.3, w: .9, d: .8 });
  solto({ t: 'caixaSom', x: 42.9, y: 1.3, w: .9, d: .8 });

  /* ---------- ESTÚDIO DE IA ---------- */
  estacao('ia', 'IA', 45.5, 4.2, 'ia');
  estacao('ia', 'IA', 49.3, 4.2, 'ia');
  estacao('ia', 'IA', 45.5, 8.8, 'ia');
  solto({ t: 'holoMesa', x: 54.6, y: 6.2, w: 3, d: 3 });
  [1.3, 2.4, 3.5, 4.6].forEach((y, i) =>
    solto({ t: 'rack', x: 61.4, y, w: 1.2, d: 1, label: 'GPU ' + String(i + 1).padStart(2, '0'), cor: R.ia.accent }));
  solto({ t: 'plant', x: 61.5, y: 11.3, k: 2 });

  /* ---------- FINANCEIRO ---------- */
  estacao('financeiro', 'FIN', 1.6, 21, 'fin');
  estacao('financeiro', 'FIN', 6.4, 21, 'fin');
  [1.2, 2.3, 3.4].forEach(x => solto({ t: 'arquivo', x, y: 27.3, w: 1, d: .9 }));
  solto({ t: 'cofre', x: 8.9, y: 26.8, w: 1.2, d: 1.2 });
  solto({ t: 'plant', x: 9.3, y: 18.2, k: 2 });

  /* ---------- VENDAS ---------- */
  estacao('vendas', 'VEN', 12.4, 20.5, 'ven');
  estacao('vendas', 'VEN', 18.4, 20.5, 'ven');
  estacao('vendas', 'VEN', 15.0, 25.0, 'ven');
  solto({ t: 'painelMetas', x: 12.3, y: 24.6, w: 2.3, d: .35 });
  solto({ t: 'gongo', x: 19.9, y: 26.6, w: 1.4, d: .6 });
  solto({ t: 'plant', x: 20.5, y: 18.2, k: 2 });

  /* ---------- MARKETING ---------- */
  estacao('marketing', 'MKT', 23.4, 20.5, 'mkt');
  estacao('marketing', 'MKT', 29.2, 20.5, 'mkt');
  estacao('marketing', 'MKT', 26.0, 25.0, 'mkt');
  solto({ t: 'painelMood', x: 23.3, y: 24.6, w: 2.3, d: .35 });
  solto({ t: 'ringLight', x: 31.2, y: 25.4 });
  solto({ t: 'plant', x: 31.5, y: 27.5, k: 2 });

  /* ---------- SALA DOS FUNCIONÁRIOS: dez estações em ilhas ---------- */
  for (const y of [19.8, 24.4])
    for (const x of [38.2, 45, 49, 53, 57.4])
      estacao('funcionarios', 'FUN', x, y, 'fun');
  solto({ t: 'cooler', x: 61.6, y: 18.2 });
  solto({ t: 'plant', x: 61.5, y: 27.5, k: 2 });
  solto({ t: 'plant', x: 37.2, y: 18.2, k: 2 });

  /* ---------- INOVAÇÃO ---------- */
  estacao('inovacao', 'INO', 2.0, 36.4, 'ino');
  estacao('inovacao', 'INO', 8.2, 36.4, 'ino');
  const vr = add({ t: 'vrPad', x: 1.8, y: 40.4, w: 2.8, d: 2.8, cor: R.inovacao.accent });
  descanso('VR0', 'realidade virtual', 3.2, 41.8, 's', 'testando realidade virtual', vr);
  solto({ t: 'impressora3d', x: 9.6, y: 41.6, w: 1.2, d: 1.2 });
  solto({ t: 'quadroMovel', x: 5.6, y: 43.4, w: 2.4, d: .35 });
  solto({ t: 'plant', x: 10.4, y: 34.2, k: 2 });

  /* ---------- ANIMAÇÃO 2D & MOTION ---------- */
  estacao('animacao', 'ANI', 13.6, 36.4, 'ani');
  estacao('animacao', 'ANI', 20.4, 36.4, 'ani');
  estacao('animacao', 'ANI', 16.6, 40.6, 'ani');
  solto({ t: 'mesaLuz', x: 21.4, y: 41.4, w: 2.2, d: 1.4 });
  solto({ t: 'plant', x: 13.3, y: 43.4, k: 2 });

  /* ---------- EDIÇÃO ---------- */
  estacao('edicao', 'EDI', 26.4, 36.4, 'edi');
  estacao('edicao', 'EDI', 32.2, 36.4, 'edi');
  const sofaEd = solto({ t: 'sofa', x: 28.2, y: 41.8, w: 4, d: 1.4, dir: 's', c: '#55524e',
                         dk: 32.2 + 43.2 - .3 });
  [29.0, 30.2, 31.4].forEach((x, i) =>
    descanso('EDS' + i, 'sofá da edição', x, 42.5, 'n', 'acompanhando o corte', sofaEd, true));

  /* ---------- CORREÇÃO DE COR ---------- */
  estacao('cor', 'COR', 39.6, 37.4, 'cor');
  solto({ t: 'refMonitor', x: 39.4, y: 34.3, w: 3.4, d: .35 });
  const sofaCor = solto({ t: 'sofa', x: 38.4, y: 41.8, w: 3.6, d: 1.4, dir: 's', c: '#4f4c49',
                          dk: 42.0 + 43.2 - .3 });
  [39.4, 41.0].forEach((x, i) =>
    descanso('CRS' + i, 'sofá da cor', x, 42.5, 'n', 'aprovando a cor', sofaCor, true));
  solto({ t: 'plant', x: 44.3, y: 43.4, k: 2 });

  /* ---------- SALA DE JOGOS ---------- */
  [47.3, 49.1, 50.9].forEach((x, i) => {
    const o = solto({ t: 'arcade', x, y: 34.2, w: 1.5, d: 1.2, cor: ['#fb7d4b', '#5eead4', '#f472b6'][i] });
    descanso('ARC' + i, 'fliperama', x + .75, 36.0, 'n', 'jogando fliperama', o);
  });
  const pool = solto({ t: 'poolTable', x: 56.6, y: 35.6, w: 4.6, d: 2.6 });
  descanso('POOL0', 'sinuca', 55.6, 36.9, 'e', 'na sinuca', pool);
  descanso('POOL1', 'sinuca', 62.1, 36.9, 'w', 'na sinuca', pool);
  descanso('POOL2', 'sinuca', 58.9, 34.8, 's', 'na sinuca', pool);
  solto({ t: 'vending', x: 61.6, y: 34.1 });

  const ping = solto({ t: 'pingPong', x: 48.2, y: 38.4, w: 4.2, d: 2.2 });
  descanso('PING0', 'pingue-pongue', 47.4, 39.5, 'e', 'no pingue-pongue', ping);
  descanso('PING1', 'pingue-pongue', 53.2, 39.5, 'w', 'no pingue-pongue', ping);

  const peb = solto({ t: 'foosball', x: 56, y: 40, w: 4.2, d: 2 });
  descanso('PEB0', 'pebolim', 55.0, 41.0, 'e', 'no pebolim', peb);
  descanso('PEB1', 'pebolim', 61.1, 41.0, 'w', 'no pebolim', peb);

  solto({ t: 'tvPe', x: 47.6, y: 41.5, w: 3.6, d: .45 });
  // pufes na mesma linha: a fileira de trás fica livre para chegar neles
  [[47.6, 42.8, 18], [49.6, 42.8, 200], [51.6, 42.8, 330]].forEach((b, i) => {
    const o = solto({ t: 'beanbag', x: b[0], y: b[1], w: 1.2, d: 1.2, hue: b[2] });
    descanso('BAG' + i, 'puff', b[0] + .6, b[1] + .55, 'n', 'jogando videogame', o, true);
  });

  const bar = solto({ t: 'bar', x: 58.4, y: 43.3, w: 3.8, d: 1.2 });
  descanso('BAR0', 'bar', 59.4, 42.4, 's', 'tomando um café', bar);
  descanso('BAR1', 'bar', 61.2, 42.4, 's', 'tomando um café', bar);

  /* ---------- RECEPÇÃO & CORREDORES ----------
     Corredores de 3 tiles: decoração só na fileira de cima (y 14 / 30) e
     na de baixo (y 16 / 32). A do meio (y 15 / 31) fica sempre livre —
     é por ela que todo mundo chega do elevador.                        */
  add({ t: 'elevator', x: 62, y: 14.4, w: 1, d: 2.2 });
  solto({ t: 'reception', x: 57.6, y: 14.0, w: 3, d: .95 });
  solto({ t: 'cameraCine', x: 55.3, y: 14.0, w: 1, d: .95 });
  solto({ t: 'ovelha', x: 46.2, y: 14.0, w: 1.6, d: .95 });
  [11, 25.6, 39.6].forEach(x => solto({ t: 'banco', x, y: 14.15, w: 2.6, d: .7 }));
  [9, 24, 45].forEach(x => solto({ t: 'banco', x, y: 30.15, w: 2.6, d: .7 }));
  [2, 17.5, 31.5, 44].forEach(x => solto({ t: 'plant', x, y: 14.0, w: 1, d: .95, k: 2 }));
  [2, 15, 38, 50, 61.6].forEach(x => solto({ t: 'plant', x, y: 30.0, w: 1, d: .95, k: 2 }));

  /* ---------- verde: vaso grande em cada canto livre e floreiras nos corredores ---------- */
  const pertoDePorta = (x, y) => WORLD.DOORS.some(d => Math.abs(d.x - x) <= 2 && Math.abs(d.y - y) <= 2);
  const temLugar = (x, y) => [...workSlots, ...restSlots, ...meetSlots]
    .some(s => Math.abs(Math.floor(s.x) - x) <= 1 && Math.abs(Math.floor(s.y) - y) <= 1);
  for (const r of Object.values(R)) {
    if (r.bw === undefined || r.id === 'cinema') continue;
    for (const [cx, cy] of [[r.x1, r.y1], [r.x2, r.y1], [r.x1, r.y2], [r.x2, r.y2]]) {
      if (!WORLD.walkable(cx, cy) || pertoDePorta(cx, cy) || temLugar(cx, cy)) continue;
      solto({ t: 'plant', x: cx + .05, y: cy + .05, k: 2, s: 1.25 });
    }
  }
  [[8.5, 5], [19, 6], [29.5, 3], [37, 4], [45, 7], [57, 4]]
    .forEach(([x, w]) => solto({ t: 'jardineira', x, y: 16.25, w, d: .6 }));
  [[9, 6], [21, 6], [33, 8], [46, 6], [57, 5]]
    .forEach(([x, w]) => solto({ t: 'jardineira', x, y: 32.25, w, d: .6 }));

  /* ===========================================================
     DESENHO
     =========================================================== */
  /** pinta sub-peças de um móvel do fundo para a frente (menor y primeiro) */
  function emOrdem(pecas) {
    pecas.sort((a, b) => a[0] - b[0]).forEach(p => p[1]());
  }

  /* Peças que nunca mudam (cadeira, sinuca, pebolim, sofá, expositor…) são
     pintadas uma vez num canvas próprio e depois só copiadas. O cache é
     feito em 2x para continuar nítido no zoom. O que tem RGB ou animação
     — mesa, arcade, rack, TV, planta — continua sendo desenhado ao vivo. */
  const ALTURA_CACHE = {
    chairGamer: 78, chairBoss: 84, chairSimple: 58, chairStudio: 78, expositor: 96,
    poltrona: 60, banco: 30, arquivo: 64, cofre: 58, caixaSom: 84, pingPong: 50,
    pilhaCaixas: 118, poolTable: 56, foosball: 52, sofa: 60,
    rug: 12, lowTable: 40, cooler: 64, plant: 100, jardineira: 70
  };
  const ESC_CACHE = 2;
  const cacheMovel = new Map();

  function montaCacheMovel(o, f) {
    const w = o.w || 1, d = o.d || 1;
    const alto = ALTURA_CACHE[o.t] || 120;
    const x0 = ISO.toScreen(o.x, o.y + d).x - 22;
    const x1 = ISO.toScreen(o.x + w, o.y).x + 22;
    const y0 = ISO.toScreen(o.x, o.y).y - alto;
    const y1 = ISO.toScreen(o.x + w, o.y + d).y + 26;
    const W = Math.ceil((x1 - x0) * ESC_CACHE), H = Math.ceil((y1 - y0) * ESC_CACHE);
    if (W <= 0 || H <= 0 || W * H > 1.2e6) return null;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.scale(ESC_CACHE, ESC_CACHE);
    c.translate(-x0, -y0);
    f(c, o, 0);
    return { cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* Mesa parada também não muda: sem ninguém trabalhando nela, a tela fica
     apagada e dá para usar a cópia em cache. Só a mesa ocupada anima. */
  const cacheMesaParada = new Map();

  function drawItem(ctx, o, t) {
    const f = DRAW[o.t];
    if (!f) return;
    if (o.t === 'deskStudio' && !o.busy) {
      let c = cacheMesaParada.get(o);
      if (c === undefined) { c = montaCacheMovel(o, f); cacheMesaParada.set(o, c); }
      if (c) { ctx.drawImage(c.cv, c.x, c.y, c.w, c.h); return; }
    }
    if (!(o.t in ALTURA_CACHE)) { f(ctx, o, t); return; }
    let c = cacheMovel.get(o);
    if (c === undefined) { c = montaCacheMovel(o, f); cacheMovel.set(o, c); }
    if (!c) { f(ctx, o, t); return; }
    ctx.drawImage(c.cv, c.x, c.y, c.w, c.h);
  }
  function depth(o) {
    if (o.dk !== undefined) return o.dk;
    return (o.x + (o.w || 1) / 2) + (o.y + (o.d || 1) / 2);
  }

  /** superfície virada para +y (a que a câmera enxerga), em px */
  function faceY(ctx, x, yPlane, lenTiles, topZ, fn) {
    const T = ISO.TW;
    const o = ISO.toScreen(x, yPlane, topZ);
    ctx.save();
    ctx.transform(ISO.HW / T, ISO.HH / T, 0, 1, o.x, o.y);
    fn(ctx, lenTiles * T);
    ctx.restore();
  }

  /** caneca de café em cima da mesa (cor muda por mesa) */
  const CANECAS = ['#e9edf8', '#7c6cff', '#38bdf8', '#f472b6', '#22c55e'];
  function caneca(ctx, cx, cy, z, cor, s = 1) {
    const c = CANECAS[((cor | 0) % CANECAS.length + CANECAS.length) % CANECAS.length];
    const r = 0.11 * s;
    ISO.cyl(ctx, cx, cy, r, 13 * s, z, c);
    ISO.cyl(ctx, cx, cy, r * .82, 1.5, z + 13 * s - 1.5, '#3b2418');
    const p = ISO.toScreen(cx + r * 1.2, cy, z + 7 * s);
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.arc(p.x + 1.5 * s, p.y, 2.6 * s, -1.3, 1.3); ctx.stroke(); ctx.restore();
  }

  const DRAW = {

    /* ================= MESA GAMER =================
       Suporta mesa no eixo Y (face 'n'/'s') e no eixo X (face 'e'/'w').
       No eixo X o boneco senta de perfil e a mesa fica ao lado dele.     */
    deskGamer(ctx, o, t) {
      const { x, y, w, d } = o;
      const neon = ISO.hsl((o.hue + t * 26) % 360, 92, 58);
      const eixoX = (o.face === 'e' || o.face === 'w');
      // a tela só aponta para a câmera quando o boneco está de costas
      const telaVisivel = (o.face === 'n' || o.face === 'w');

      ISO.shadow(ctx, x + w / 2, y + d / 2, Math.max(w, d) * .55, .28);

      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gp = S(x + w / 2, y + d / 2, 6);
      ISO.glow(ctx, gp.x, gp.y, 74, neon, o.busy ? .3 : .13);
      ctx.restore();

      /* estrutura: dois painéis nas pontas + travessa */
      if (eixoX) {
        ISO.box(ctx, x + .12, y + .05,      w - .24, .17, 25, 0, '#1c202b');
        ISO.box(ctx, x + .12, y + d - .22,  w - .24, .17, 25, 0, '#1c202b');
        ISO.box(ctx, x + .16, y + .22,      .1, d - .44, 14, 6, '#181c26');
      } else {
        ISO.box(ctx, x + .05,     y + .12, .17, d - .24, 25, 0, '#1c202b');
        ISO.box(ctx, x + w - .22, y + .12, .17, d - .24, 25, 0, '#1c202b');
        ISO.box(ctx, x + .22,     y + .16, w - .44, .1,  14, 6, '#181c26');
      }
      ISO.plane(ctx, x - .05, y - .05, w + .1, d + .1, TOP, '#39414f');
      ISO.plane(ctx, x + .1,  y + .06, w - .2, d - .22, TOP + .1, 'rgba(255,255,255,.028)');

      // fita de LED na borda do tampo virada para a câmera
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ISO.quad(ctx, [S(x - .05, y + d + .05, 25), S(x + w + .05, y + d + .05, 25),
                     S(x + w + .05, y + d + .05, 21), S(x - .05, y + d + .05, 21)],
               ISO.rgba(neon, .68));
      ctx.restore();

      if (eixoX) {
        // mesa de lado: monitor no fundo, teclado na beira de quem senta
        const cy  = y + d / 2;
        const monX = o.face === 'e' ? x + .55 : x + .2;
        const tecX = o.face === 'e' ? x + .06 : x + .62;
        emOrdem([
          [monX, () => monitorY(ctx, monX, cy - .85, 1.7, telaVisivel, o.busy, neon, t)],
          [tecX, () => tecladoY(ctx, tecX, cy - .78, neon)],
          [x + .1,  () => gabinete(ctx, x + .1, y + d - .92, neon, t)],
          [x + w - .45, () => caneca(ctx, x + w - .35, y + .38, TOP, o.sabor, .85)]
        ]);
      } else {
        const monY = o.face === 'n' ? y + .12 : y + .62;
        const tecY = o.face === 'n' ? y + .78 : y + .06;
        const mw = 1.7, mx = x + w / 2 - mw / 2 - .3;
        emOrdem([
          [monY,      () => monitor(ctx, mx, monY, mw, telaVisivel, o.busy, neon, t, o)],
          [tecY,      () => teclado(ctx, x + w / 2 - .95, tecY, neon)],
          [y + .14,   () => gabinete(ctx, x + w - .68, y + .14, neon, t)],
          [y + d / 2, () => caneca(ctx, x + .42, y + d / 2, TOP, o.sabor, .85)]
        ]);
      }
    },

    /* ================= MESA DA DIRETORIA ================= */
    deskBoss(ctx, o, t) {
      const { x, y, w, d } = o;
      const neon = o.cor || ISO.hsl((o.hue + t * 16) % 360, 88, 56);
      ISO.shadow(ctx, x + w / 2, y + d / 2, 2.1, .3);

      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gp = S(x + w / 2, y + d / 2, 6);
      ISO.glow(ctx, gp.x, gp.y, 94, neon, o.busy ? .3 : .13);
      ctx.restore();

      ISO.box(ctx, x + .06,     y + .12, .2, d - .24, 25, 0, '#191419');
      ISO.box(ctx, x + w - .26, y + .12, .2, d - .24, 25, 0, '#191419');
      ISO.box(ctx, x + .26,     y + .16, w - .52, .12, 16, 6, '#151115');
      ISO.plane(ctx, x - .06, y - .06, w + .12, d + .12, TOP, '#3d2d35');
      for (let i = 0; i < 6; i++)
        ISO.plane(ctx, x, y + .12 + i * .24, w, .035, TOP + .1, 'rgba(255,255,255,.04)');

      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ISO.quad(ctx, [S(x - .06, y + d + .06, 25), S(x + w + .06, y + d + .06, 25),
                     S(x + w + .06, y + d + .06, 21), S(x - .06, y + d + .06, 21)],
               ISO.rgba(neon, .7));
      ctx.restore();

      // dois monitores, de costas (quem senta está de frente para nós)
      const monY = y + .66;
      emOrdem([
        [monY,      () => { monitor(ctx, x + .42,  monY, 1.5, false, o.busy, neon, t, o);
                            monitor(ctx, x + 2.24, monY, 1.5, false, o.busy, neon, t, o); }],
        [y + .06,   () => teclado(ctx, x + w / 2 - 1.0, y + .06, neon)],
        [y + .18,   () => gabinete(ctx, x + w - .72, y + .18, neon, t)],
        [y + d - .3,() => caneca(ctx, x + .2, y + d - .3, TOP, 0, .9)]
      ]);
    },

    /* ================= CADEIRAS ================= */
    chairGamer(ctx, o) { const a = ISO.hsl(o.hue, 85, 52);
      cadeiraBase(ctx, o, '#14171f', a, 30, true); },
    chairBoss(ctx, o)  {
      cadeiraBase(ctx, o, '#1a1419', '#7c6cff', 33, true); },
    chairSimple(ctx, o){
      cadeiraBase(ctx, o, '#2a2826', WORLD.C.luz, 22, false); },

    /* ---------- o resto do mobiliário ---------- */
    arcade(ctx, o, t) {
      const { x, y } = o;
      const neon = o.cor || ISO.hsl((o.hue + t * 40) % 360, 95, 60);
      ISO.shadow(ctx, x + .75, y + .6, .9, .3);
      ISO.box(ctx, x, y, 1.5, 1.2, 84, 0, '#161a2c');
      ISO.box(ctx, x - .04, y - .04, 1.58, 1.28, 14, 84, '#0e1120', { top: ISO.rgba(neon, .8) });
      const p1 = S(x, y + 1.2, 74), p2 = S(x + 1.5, y + 1.2, 74);
      const p3 = S(x + 1.5, y + 1.2, 44), p4 = S(x, y + 1.2, 44);
      ISO.quad(ctx, [p1, p2, p3, p4], '#04060e');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const f = i / 9, hh = .15 + .5 * Math.abs(Math.sin(t * 3 + i));
        ISO.quad(ctx, [
          { x: p1.x + (p2.x - p1.x) * f,        y: p1.y + (p2.y - p1.y) * f + (p4.y - p1.y) * hh },
          { x: p1.x + (p2.x - p1.x) * (f + .07), y: p1.y + (p2.y - p1.y) * (f + .07) + (p4.y - p1.y) * hh },
          { x: p1.x + (p2.x - p1.x) * (f + .07), y: p4.y + (p3.y - p4.y) * (f + .07) },
          { x: p1.x + (p2.x - p1.x) * f,         y: p4.y + (p3.y - p4.y) * f }
        ], ISO.rgba(o.cor ? ISO.shade(o.cor, (i % 3) * .2 - .2) : ISO.hsl((o.hue + i * 30) % 360, 95, 60), .55));
      }
      ctx.restore();
      ISO.box(ctx, x + .05, y + 1.14, 1.4, .5, 8, 34, '#1b2136', { top: '#262d47' });
      ISO.cyl(ctx, x + .45, y + 1.4, .1, 9, 42, '#7c6cff');
      ISO.cyl(ctx, x + .75, y + 1.4, .09, 7, 42, '#38bdf8');
      ISO.cyl(ctx, x + 1.05, y + 1.4, .09, 7, 42, '#c4b8ff');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = S(x + .75, y + .6, 70); ISO.glow(ctx, g.x, g.y, 74, neon, .3);
      ctx.restore();
    },

    poolTable(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, 2.4, .32);
      [[.2, .2], [w - .6, .2], [.2, d - .6], [w - .6, d - .6]]
        .forEach(p => ISO.box(ctx, x + p[0], y + p[1], .4, .4, 26, 0, '#231208'));
      ISO.box(ctx, x, y, w, d, 12, 26, '#3a1d0c', { top: '#4a2610' });
      ISO.plane(ctx, x + .28, y + .28, w - .56, d - .56, 38.4, '#0f5c3a');
      ISO.plane(ctx, x + .28, y + .28, w - .56, d - .56, 38.4, null, 'rgba(0,0,0,.35)');
      [['#f2f2f2', .5, .5], ['#c4b8ff', 2.6, 1.0], ['#7c6cff', 3.0, 1.35],
       ['#18a2ff', 3.3, .9], ['#8b5cf6', 2.8, 1.7], ['#22c55e', 3.5, 1.6]]
      .forEach(([c, bx, by]) => {
        const p = S(x + bx, y + by, 38.4);
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 6, 3.4, 0, 0, 7); ctx.fill();
        const g = ctx.createRadialGradient(p.x - 2, p.y - 4, 1, p.x, p.y - 2, 7);
        g.addColorStop(0, ISO.shade(c, .5)); g.addColorStop(1, ISO.shade(c, -.25));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y - 2, 5.4, 0, 7); ctx.fill();
      });
    },

    foosball(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, 2.1, .3);
      [[.15, .15], [w - .5, .15], [.15, d - .5], [w - .5, d - .5]]
        .forEach(p => ISO.box(ctx, x + p[0], y + p[1], .35, .35, 24, 0, '#16203a'));
      ISO.box(ctx, x, y, w, d, 10, 24, '#1d2742', { top: '#14361f' });
      ISO.plane(ctx, x + .2, y + .2, w - .4, d - .4, 34.4, '#166534');
      ISO.plane(ctx, x + w / 2 - .03, y + .2, .06, d - .4, 34.5, 'rgba(255,255,255,.45)');
      for (let i = 0; i < 5; i++) {
        const bx = x + .6 + i * ((w - 1.2) / 4);
        ISO.box(ctx, bx, y - .18, .07, d + .36, 4, 44, '#9aa6c4');
        for (let j = 0; j < 3; j++)
          ISO.box(ctx, bx - .07, y + .5 + j * ((d - 1) / 2) - .1, .22, .22, 11, 34,
                  i % 2 ? '#7c6cff' : '#18a2ff');
      }
    },

    sofa(ctx, o) {
      const { x, y, w, d } = o;
      const c = o.c || '#2b2340';
      ISO.shadow(ctx, x + w / 2, y + d / 2, Math.max(w, d) * .55, .28);
      ISO.box(ctx, x, y, w, d, 16, 0, ISO.shade(c, -.2));
      if (o.dir === 'n') {
        ISO.box(ctx, x, y, w, .42, 34, 16, c);
        ISO.box(ctx, x, y + .42, .38, d - .42, 16, 16, ISO.shade(c, .06));
        ISO.box(ctx, x + w - .38, y + .42, .38, d - .42, 16, 16, ISO.shade(c, .06));
        ISO.plane(ctx, x + .4, y + .46, w - .8, d - .5, 32, ISO.shade(c, .16));
      } else if (o.dir === 's') {
        // encosto virado para a câmera: quem senta olha para o fundo da sala
        ISO.box(ctx, x, y, .38, d - .42, 16, 16, ISO.shade(c, .06));
        ISO.box(ctx, x + w - .38, y, .38, d - .42, 16, 16, ISO.shade(c, .06));
        ISO.plane(ctx, x + .4, y + .05, w - .8, d - .5, 32, ISO.shade(c, .16));
        ISO.box(ctx, x, y + d - .42, w, .42, 34, 16, c);
      } else {
        ISO.box(ctx, x, y, .42, d, 34, 16, c);
        ISO.box(ctx, x + .42, y, w - .42, .38, 16, 16, ISO.shade(c, .06));
        ISO.box(ctx, x + .42, y + d - .38, w - .42, .38, 16, 16, ISO.shade(c, .06));
        ISO.plane(ctx, x + .46, y + .4, w - .5, d - .8, 32, ISO.shade(c, .16));
      }
    },

    beanbag(ctx, o) {
      const { x, y } = o;
      const c = ISO.hsl(o.hue, 62, 46);
      ISO.shadow(ctx, x + .6, y + .6, .82, .28);
      const p = S(x + .6, y + .6, 0);
      const g = ctx.createRadialGradient(p.x - 6, p.y - 22, 3, p.x, p.y - 12, 30);
      g.addColorStop(0, ISO.shade(c, .3)); g.addColorStop(1, ISO.shade(c, -.28));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 11, 30, 19, 0, 0, 7); ctx.fill();
      ctx.fillStyle = ISO.shade(c, .12);
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 20, 22, 11, 0, 0, 7); ctx.fill();
    },

    lowTable(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, .9, .26);
      ISO.box(ctx, x + .12, y + .12, .12, .12, 18, 0, '#24202c');
      ISO.box(ctx, x + w - .24, y + d - .24, .12, .12, 18, 0, '#24202c');
      ISO.box(ctx, x, y, w, d, 5, 18, '#2e2836', { top: 'rgba(160,190,255,.2)' });
      caneca(ctx, x + w / 2, y + d / 2, 23, 1, .8);
    },

    rug(ctx, o) {
      const { x, y, w, d } = o;
      ISO.plane(ctx, x, y, w, d, 0.6, ISO.rgba(o.c || '#2a2240', .78));
      ISO.plane(ctx, x + .3, y + .3, w - .6, d - .6, 0.7, null, 'rgba(255,255,255,.07)');
    },

    tvWall(ctx, o, t) {
      const { x, y, w } = o;
      const h = 62, z = 46;
      ISO.box(ctx, x, y, w, .22, h, z, '#0a0c14');
      faceY(ctx, x + .02, y + .22, w - .04, z + h - 4, (c, len) => {
        c.fillStyle = '#05070f'; c.fillRect(0, 0, len, h - 8);
        if (o.meeting) {
          c.textAlign = 'left'; c.textBaseline = 'middle';
          c.font = "700 9px 'Barlow Semi Condensed', sans-serif";
          c.fillStyle = '#38bdf8'; c.fillText('SALA DE REUNIÃO', 10, 11);
          c.font = "600 8px 'Barlow Semi Condensed', sans-serif";
          c.fillStyle = 'rgba(170,182,210,.8)';
          c.fillText(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).toUpperCase(), 12, 27);
          for (let i = 0; i < 3; i++) {
            c.fillStyle = ISO.rgba('#38bdf8', .18 + .1 * i);
            c.fillRect(12, 38 + i * 9, (len - 24) * (.35 + .25 * ((Math.sin(t * .6 + i) + 1) / 2)), 4);
          }
        } else {
          for (let i = 0; i < 5; i++) {
            c.fillStyle = ISO.rgba(ISO.hsl((t * 30 + i * 60) % 360, 80, 55), .22);
            c.fillRect(i * len / 5, 0, len / 5, h - 8);
          }
        }
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gc = S(x + w / 2, y + .3, z + h / 2);
      ISO.glow(ctx, gc.x, gc.y, 110, o.meeting ? '#38bdf8' : '#7aa2ff', .18);
      ctx.restore();
    },

    bar(ctx, o, t) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, 2.3, .3);
      ISO.box(ctx, x, y, w, d, 46, 0, '#14182a', { top: '#232a44' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ISO.quad(ctx, [S(x, y + d, 46), S(x + w, y + d, 46), S(x + w, y + d, 41), S(x, y + d, 41)],
               ISO.rgba(WORLD.ROOMS.jogos.accent, .55 + .15 * Math.sin(t * 2)));
      ctx.restore();
      dispenser(ctx, x + 1.1, y + .55, '#7c6cff', t);
      dispenser(ctx, x + 2.6, y + .55, '#c4b8ff', t + 1.4);
      for (let i = 0; i < 4; i++) ISO.cyl(ctx, x + .35, y + .3 + i * .22, .08, 9, 46, '#e9edf8');
    },

    vending(ctx, o, t) {
      const { x, y } = o;
      ISO.shadow(ctx, x + .6, y + .6, .8, .3);
      ISO.box(ctx, x, y, 1.2, 1.1, 92, 0, '#141a2e');
      faceY(ctx, x + .08, y + 1.1, 1.04, 86, (c, len) => {
        c.fillStyle = 'rgba(10,14,26,.92)'; c.fillRect(0, 0, len, 62);
        for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) {
          c.fillStyle = ISO.rgba(['#38bdf8', '#a78bfa', '#f472b6'][i], .82);
          ISO.rrect(c, 5 + i * (len - 10) / 3, 6 + r * 14, (len - 10) / 3 - 4, 10, 2); c.fill();
        }
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = S(x + .6, y + .6, 60);
      ISO.glow(ctx, g.x, g.y, 62, ISO.hsl((t * 50) % 360, 90, 60), .2);
      ctx.restore();
    },

    rack(ctx, o, t) {
      const { x, y } = o;
      const neon = o.cor || ISO.hsl((o.hue + t * 12) % 360, 90, 55);
      ISO.shadow(ctx, x + .6, y + .5, .78, .3);
      ISO.box(ctx, x, y, 1.2, 1, 86, 0, '#0e1220', { top: '#1a2136' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const z = 8 + i * 8.6, on = Math.sin(t * 4 + i * 2.1) > -.2;
        ISO.quad(ctx, [S(x + .1, y + 1, z + 3), S(x + 1.1, y + 1, z + 3),
                       S(x + 1.1, y + 1, z), S(x + .1, y + 1, z)],
                 ISO.rgba(on ? neon : '#1b2540', on ? .62 : .3));
      }
      const g = S(x + .6, y + .5, 50); ISO.glow(ctx, g.x, g.y, 58, neon, .2);
      ctx.restore();
      faceY(ctx, x, y + 1, 1.2, 100, (c, len) => {
        c.textAlign = 'center'; c.font = "700 8px 'Barlow Semi Condensed', sans-serif";
        c.fillStyle = ISO.rgba(neon, .95); c.fillText(o.label, len / 2, 6);
      });
    },

    elevator(ctx, o, t) {
      const { x, y, d } = o;
      const neon = '#fff3e0';
      WORLD.wallFace(ctx, 'w', x, y, d, 96, (c, len) => {
        c.fillStyle = '#0a0d18'; ISO.rrect(c, 4, 6, len - 8, 78, 4); c.fill();
        c.strokeStyle = ISO.rgba(neon, .8); c.lineWidth = 2; c.stroke();
        c.fillStyle = ISO.rgba(neon, .35); c.fillRect(len / 2 - 1, 8, 2, 74);
        c.textAlign = 'center'; c.font = "700 9px 'Barlow Semi Condensed', sans-serif";
        c.fillStyle = ISO.rgba(neon, .9);
        c.fillText('▲ ENTRADA', len / 2, 0);
      });
    },

    reception(ctx, o, t) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, 1.6, .28);
      ISO.box(ctx, x, y, w, d, 40, 0, '#8e8f8b', { top: '#d8d5ce' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ISO.quad(ctx, [S(x, y + d, 6), S(x + w, y + d, 6), S(x + w, y + d, 3), S(x, y + d, 3)],
               ISO.rgba(WORLD.C.marca, .75));
      ctx.restore();
      faceY(ctx, x, y + d, w, 56, (c, len) => {
        c.textAlign = 'center'; c.font = "700 10px 'Barlow', sans-serif";
        c.fillStyle = 'rgba(20,20,20,.85)'; c.letterSpacing = '2px';
        c.fillText(String((window.ESCRITORIO && ESCRITORIO.nome) || 'RECEPÇÃO').toUpperCase().slice(0, 18), len / 2, 22);
      });
      caneca(ctx, x + w - .35, y + .5, 40, 0, .8);
    },

    plant(ctx, o) {
      const { x, y } = o;
      const sz = o.s || 1;
      ISO.shadow(ctx, x + .5, y + .5, .5 * sz, .28);
      const pote = o.k === 2 ? '#6e6a65' : o.k ? '#3a2b22' : '#24232a';
      ISO.cyl(ctx, x + .5, y + .5, .3 * sz, 20 * sz, 0, pote);
      ISO.cyl(ctx, x + .5, y + .5, .26 * sz, 1.5, 20 * sz - 1, '#2a1d14');
      folhagem(ctx, S(x + .5, y + .5, 20 * sz), sz, Math.round(x * 7 + y * 3));
    },

    /* floreira comprida de madeira, como as das divisórias da referência */
    jardineira(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, Math.max(w, d) * .5, .26);
      ISO.box(ctx, x, y, w, d, 18, 0, '#5c4330', { top: '#2a1d14' });
      const n = Math.max(2, Math.round(Math.max(w, d) / .55));
      for (let i = 0; i < n; i++) {
        const f = (i + .5) / n;
        const px = w > d ? x + w * f : x + w / 2, py = w > d ? y + d / 2 : y + d * f;
        folhagem(ctx, S(px, py, 18), .55, i * 3 + 1);
      }
    },

    cooler(ctx, o) {
      const { x, y } = o;
      ISO.shadow(ctx, x + .5, y + .5, .5, .26);
      ISO.box(ctx, x + .1, y + .1, .8, .8, 40, 0, '#1a2136', { top: '#252d47' });
      ISO.cyl(ctx, x + .5, y + .5, .3, 32, 40, 'rgba(120,200,255,.42)');
      ISO.cyl(ctx, x + .5, y + .5, .3, 12, 40, 'rgba(60,160,255,.62)');
    },

    trophy(ctx, o, t) {
      const { x, y } = o;
      ISO.shadow(ctx, x + .6, y + .6, .6, .3);
      ISO.box(ctx, x + .15, y + .15, .9, .9, 34, 0, '#1a1622', { top: '#2a2333' });
      ISO.cyl(ctx, x + .6, y + .6, .1, 12, 34, '#c9a227');
      ISO.cyl(ctx, x + .6, y + .6, .26, 20, 46, ISO.rgba('#c4b8ff', .9));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const p = S(x + .6, y + .6, 68);
      ISO.glow(ctx, p.x, p.y, 40, '#c4b8ff', .3 + .12 * Math.sin(t * 2));
      ctx.restore();
      ISO.cyl(ctx, x + .6, y + .6, .16, 8, 66, '#ffe98a');
    },

    neonSign(ctx, o, t) {
      const { x, y } = o;
      const neon = ISO.hsl((o.hue + t * 30) % 360, 95, 62);
      WORLD.wallFace(ctx, 'n', x, y, 3, 92, (c, len) => {
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = "700 17px 'Barlow', sans-serif";
        c.shadowColor = ISO.rgba(neon, .95); c.shadowBlur = 16;
        c.fillStyle = ISO.rgba(neon, .95); c.letterSpacing = '2px';
        c.fillText(o.txt, len / 2, 16);
        c.shadowBlur = 0; c.letterSpacing = '0px';
        c.strokeStyle = ISO.rgba(neon, .35); c.lineWidth = 1;
        c.beginPath(); c.moveTo(14, 32); c.lineTo(len - 14, 32); c.stroke();
      });
    },

    /* ================= MESA DO ESTÚDIO =================
       Tampo claro sobre duas lâminas de concreto, filete de luz da sala
       na borda. O que vai em cima depende do departamento (o.v).     */
    deskStudio(ctx, o, t) {
      const { x, y, w, d } = o;
      const acc = o.cor || '#ffffff';
      const luz = WORLD.C.luz;
      ISO.shadow(ctx, x + w / 2, y + d / 2, Math.max(w, d) * .55, .28);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gp = S(x + w / 2, y + d / 2, 6);
      ISO.glow(ctx, gp.x, gp.y, 78, luz, o.busy ? .16 : .08);
      ctx.restore();
      ISO.box(ctx, x + .06,     y + .1, .16, d - .2, 25, 0, '#1d1c1b');
      ISO.box(ctx, x + w - .22, y + .1, .16, d - .2, 25, 0, '#1d1c1b');
      ISO.box(ctx, x - .04, y - .04, w + .08, d + .08, 3, 25, '#5e412d', { top: '#71503a' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ISO.quad(ctx, [S(x - .04, y + d + .04, 25.6), S(x + w + .04, y + d + .04, 25.6),
                     S(x + w + .04, y + d + .04, 24.2), S(x - .04, y + d + .04, 24.2)],
               ISO.rgba(luz, o.busy ? .8 : .4));
      ctx.restore();

      const monY = y + .12, tecY = y + .8;
      const pecas = [];
      const tela = (mx, mw) => pecas.push([monY, () => monitor(ctx, mx, monY, mw, true, o.busy, acc, t, o)]);
      if (o.v === 'ia')       { tela(x + .06, .94); tela(x + 1.03, .94); tela(x + 2.0, .94); }
      else if (o.v === 'edi') { tela(x + .3, 1.15); tela(x + 1.5, 1.15);
                                pecas.push([y + .2, () => { caixinha(ctx, x + .02, y + .2); caixinha(ctx, x + w - .3, y + .2); }]); }
      else if (o.v === 'fun' || o.v === 'fin') { tela(x + .2, 1.25); tela(x + 1.5, 1.25); }
      else if (o.v === 'cor') { tela(x + .55, 1.9); }
      else                    { tela(x + .55, 1.7); }

      if (o.v === 'cor') pecas.push([tecY, () => painelCor(ctx, x + .5, tecY - .05, acc)]);
      else if (o.v === 'ani') pecas.push([tecY, () => mesaDigitalizadora(ctx, x + .7, tecY - .08, acc, t, o.busy)]);
      else pecas.push([tecY, () => teclado(ctx, x + w / 2 - .95, tecY, acc)]);
      pecas.push([y + d / 2, () => caneca(ctx, x + w - .3, y + d - .32, TOP, o.sabor, .8)]);
      emOrdem(pecas);
    },

    chairStudio(ctx, o) {
      cadeiraBase(ctx, o, '#1b1c1e', typeof o.hue === 'string' ? o.hue : '#9aa0a6', 30, true); },

    /* ================= POLTRONA DE CINEMA ================= */
    poltrona(ctx, o) {
      const { x, y, w, d } = o;
      const cor = '#4a1d22';
      ISO.shadow(ctx, x + w / 2, y + d / 2, .62, .3);
      ISO.box(ctx, x + .12, y + .1, w - .24, d - .3, 15, 0, ISO.shade(cor, -.3));
      ISO.box(ctx, x + .14, y + .08, w - .28, d - .38, 5, 15, cor, { top: ISO.shade(cor, .12) });
      ISO.box(ctx, x, y + .05, .14, d - .1, 26, 0, '#1c1c1d');
      ISO.box(ctx, x + w - .14, y + .05, .14, d - .1, 26, 0, '#1c1c1d');
      ISO.box(ctx, x + .1, y + d - .32, w - .2, .3, 48, 0, cor, { top: ISO.shade(cor, .2) });
    },

    caixaSom(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, .55, .3);
      ISO.box(ctx, x, y, w, d, 74, 0, '#161617', { top: '#262628' });
      faceY(ctx, x, y + d, w, 74, (c, len) => {
        c.fillStyle = '#0b0b0c';
        for (const [v, r] of [[14, 6], [34, 10], [58, 10]]) { c.beginPath(); c.arc(len / 2, v, r, 0, 7); c.fill(); }
        c.strokeStyle = 'rgba(255,255,255,.12)';
        for (const [v, r] of [[14, 6], [34, 10], [58, 10]]) { c.beginPath(); c.arc(len / 2, v, r, 0, 7); c.stroke(); }
      });
    },

    /* ================= MESA HOLOGRÁFICA ================= */
    holoMesa(ctx, o, t) {
      const { x, y, w, d } = o;
      const acc = WORLD.ROOMS.ia.accent;
      const cx = x + w / 2, cy = y + d / 2;
      ISO.shadow(ctx, cx, cy, 1.5, .3);
      ISO.cyl(ctx, cx, cy, .45, 22, 0, '#2a2b2d');
      ISO.cyl(ctx, cx, cy, 1.25, 5, 22, '#1a1b1c');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const b = S(cx, cy, 27);
      ctx.fillStyle = ISO.rgba(acc, .22);
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 1.05 * ISO.HW, 1.05 * ISO.HH, 0, 0, 7); ctx.fill();
      // cone de luz
      const topo = S(cx, cy, 92);
      const g = ctx.createLinearGradient(0, b.y, 0, topo.y);
      g.addColorStop(0, ISO.rgba(acc, .32)); g.addColorStop(1, ISO.rgba(acc, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(b.x - 30, b.y); ctx.lineTo(b.x - 46, topo.y); ctx.lineTo(b.x + 46, topo.y); ctx.lineTo(b.x + 30, b.y);
      ctx.closePath(); ctx.fill();
      // poliedro girando: o "modelo" que a IA está gerando
      const meio = S(cx, cy, 62), R0 = 20;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = t * .9 + i * Math.PI / 3;
        pts.push({ x: meio.x + Math.cos(a) * R0, y: meio.y + Math.sin(a) * R0 * .45 });
      }
      ctx.strokeStyle = ISO.rgba(acc, .85); ctx.lineWidth = 1.2;
      ctx.beginPath();
      pts.forEach((p, i) => {
        ctx.moveTo(meio.x, meio.y - 22); ctx.lineTo(p.x, p.y);
        ctx.lineTo(meio.x, meio.y + 22);
        const q = pts[(i + 1) % 6]; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
      ISO.glow(ctx, meio.x, meio.y, 60, acc, .25 + .1 * Math.sin(t * 2));
      ctx.restore();
    },

    /* ================= PRÊMIOS: 15 anos de estrada ================= */
    premios(ctx, o, t) {
      const { x, y, w, d } = o;
      const h = 92;
      ISO.shadow(ctx, x + w / 2, y + d / 2, 1.4, .28);
      ISO.box(ctx, x, y, w, d, h, 0, '#1a1a1b', { top: '#2a2a2b' });
      // vitrine na face +x
      WORLD.wallFace(ctx, 'w', x + w - 1, y, d, h - 4, (c, len) => {
        c.fillStyle = 'rgba(40,42,44,.95)'; c.fillRect(6, 4, len - 12, h - 14);
        c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(6, 4, len - 12, h - 14);
        for (let s = 0; s < 3; s++) {
          const sv = 30 + s * 26;
          c.fillStyle = '#5a5b5c'; c.fillRect(8, sv, len - 16, 2);
          for (let k = 0; k < 4; k++) {
            const ux = 24 + k * ((len - 48) / 3);
            const ouro = (s + k) % 3 !== 2;
            c.fillStyle = ouro ? '#d4af37' : '#c9c9c9';
            c.fillRect(ux - 2, sv - 6, 4, 6);
            c.beginPath(); c.moveTo(ux - 7, sv - 18); c.lineTo(ux + 7, sv - 18); c.lineTo(ux, sv - 6); c.closePath(); c.fill();
            if (ouro) { c.beginPath(); c.arc(ux, sv - 20, 3, 0, 7); c.fill(); }
          }
        }
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = "700 9px 'Barlow', sans-serif"; c.letterSpacing = '2px';
        c.fillStyle = WORLD.C.marca;
        c.fillText('15 ANOS', len / 2, 12);
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = S(x + w, y + d / 2, 60);
      ISO.glow(ctx, g.x, g.y, 60, '#ffe7a8', .12 + .03 * Math.sin(t * 1.5));
      ctx.restore();
    },

    /* ================= CÂMERA DE CINEMA NO TRIPÉ ================= */
    cameraCine(ctx, o, t) {
      const cx = o.x + .5, cy = o.y + .5;
      ISO.shadow(ctx, cx, cy, .55, .3);
      const topo = S(cx, cy, 58);
      ctx.strokeStyle = '#1c1c1d'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      for (const [dx, dy] of [[-.42, .3], [.42, .3], [0, -.45]]) {
        const p = S(cx + dx, cy + dy, 0);
        ctx.beginPath(); ctx.moveTo(topo.x, topo.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ISO.box(ctx, cx - .22, cy - .3, .44, .6, 20, 58, '#202122', { top: '#2f3031' });
      ISO.box(ctx, cx - .12, cy + .3, .24, .34, 12, 62, '#111112');            // lente
      ISO.box(ctx, cx - .2, cy + .62, .4, .06, 18, 59, '#0b0b0c');             // matte box
      ISO.box(ctx, cx - .08, cy - .3, .16, .3, 6, 78, '#3a3b3c');              // monitor de topo
      const led = S(cx + .22, cy - .1, 74);
      ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff2d2d' : '#5a1010';
      ctx.beginPath(); ctx.arc(led.x, led.y, 1.6, 0, 7); ctx.fill();
    },

    /* ================= A OVELHA DA RECEPÇÃO ================= */
    ovelha(ctx, o, t) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, .95, .3);
      ISO.box(ctx, x, y, w, d, 18, 0, '#8e8f8b', { top: '#a8a9a4' });
      const b = S(x + w / 2, y + d / 2, 18);
      const resp = Math.sin(t * 1.2) * .6;
      ctx.fillStyle = '#1a1a1a';
      for (const dx of [-9, -3, 4, 10]) ctx.fillRect(b.x + dx, b.y - 14, 3, 14);
      ctx.fillStyle = '#f3f2ee';
      for (const [dx, dy, r] of [[0, -26, 14], [-12, -22, 11], [12, -22, 11], [-6, -36, 11], [7, -35, 11], [0, -18, 10]]) {
        ctx.beginPath(); ctx.arc(b.x + dx, b.y + dy - resp, r, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,.08)';
      ctx.beginPath(); ctx.arc(b.x + 4, b.y - 20 - resp, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#151515';
      ctx.beginPath(); ctx.ellipse(b.x + 19, b.y - 34 - resp, 8, 6.5, .35, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(b.x + 14, b.y - 41 - resp, 4.5, 2.2, -.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x + 21, b.y - 36 - resp, 1.3, 0, 7); ctx.fill();
      // óculos escuros: é uma ovelha rock
      ctx.fillStyle = WORLD.C.marca;
      ctx.fillRect(b.x + 17, b.y - 37 - resp, 8, 2.2);
    },

    arquivo(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, .55, .26);
      ISO.box(ctx, x, y, w, d, 52, 0, '#5b5c5e', { top: '#76777a' });
      faceY(ctx, x, y + d, w, 52, (c, len) => {
        for (let i = 0; i < 3; i++) {
          c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(3, 3 + i * 16, len - 6, 1);
          c.fillStyle = '#c8c8c8'; c.fillRect(len / 2 - 6, 9 + i * 16, 12, 2);
        }
      });
    },

    cofre(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, .7, .3);
      ISO.box(ctx, x, y, w, d, 46, 0, '#2c2d2f', { top: '#3c3d40' });
      faceY(ctx, x, y + d, w, 46, (c, len) => {
        c.strokeStyle = 'rgba(255,255,255,.12)'; c.strokeRect(5, 5, len - 10, 36);
        c.fillStyle = '#b8b9bb'; c.beginPath(); c.arc(len / 2, 22, 7, 0, 7); c.fill();
        c.fillStyle = '#2c2d2f'; c.beginPath(); c.arc(len / 2, 22, 3, 0, 7); c.fill();
        c.fillStyle = '#d4b670'; c.fillRect(len - 18, 18, 8, 3);
      });
    },

    /* painel de metas de vendas, de pé sobre dois pés */
    painelMetas(ctx, o, t) {
      const { x, y, w, d } = o;
      const acc = WORLD.ROOMS.vendas.accent;
      ISO.box(ctx, x + .2, y, .12, d, 36, 0, '#1b1b1c');
      ISO.box(ctx, x + w - .32, y, .12, d, 36, 0, '#1b1b1c');
      ISO.box(ctx, x, y, w, .12, 50, 36, '#111112');
      faceY(ctx, x + .04, y + .12, w - .08, 84, (c, len) => {
        c.fillStyle = '#0a0a0b'; c.fillRect(0, 0, len, 46);
        c.textBaseline = 'middle'; c.textAlign = 'left';
        c.font = "700 7px 'Barlow Semi Condensed', sans-serif";
        c.fillStyle = acc; c.fillText('META DO MÊS', 6, 7);
        const nomes = ['PROPOSTAS', 'FECHADOS', 'FATURADO'];
        nomes.forEach((n, i) => {
          const v = .4 + .5 * Math.abs(Math.sin(i * 1.7 + t * .2));
          c.fillStyle = 'rgba(255,255,255,.5)';
          c.font = "600 5.5px 'Barlow Semi Condensed', sans-serif";
          c.fillText(n, 6, 17 + i * 10);
          c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(46, 15 + i * 10, len - 54, 4);
          c.fillStyle = ISO.rgba(acc, .9);      c.fillRect(46, 15 + i * 10, (len - 54) * v, 4);
        });
      });
    },

    /* moodboard do marketing */
    painelMood(ctx, o) {
      const { x, y, w, d } = o;
      ISO.box(ctx, x + .2, y, .12, d, 30, 0, '#1b1b1c');
      ISO.box(ctx, x + w - .32, y, .12, d, 30, 0, '#1b1b1c');
      ISO.box(ctx, x, y, w, .12, 56, 30, '#ecebe7');
      faceY(ctx, x + .04, y + .12, w - .08, 84, (c, len) => {
        c.fillStyle = '#f4f3ef'; c.fillRect(0, 0, len, 52);
        const cores = ['#f472b6', '#1f1f1f', '#fbbf24', '#60a5fa', '#a3e635', '#ff5a1f', '#c084fc', '#e5e5e5'];
        for (let i = 0; i < 8; i++) {
          c.fillStyle = cores[i];
          c.fillRect(5 + (i % 4) * ((len - 10) / 4), 5 + Math.floor(i / 4) * 22, (len - 10) / 4 - 4, 18);
        }
      });
    },

    gongo(ctx, o, t) {
      const { x, y, w } = o;
      ISO.box(ctx, x, y + .2, .1, .2, 62, 0, '#2a2a2b');
      ISO.box(ctx, x + w - .1, y + .2, .1, .2, 62, 0, '#2a2a2b');
      ISO.box(ctx, x, y + .2, w, .2, 5, 62, '#2a2a2b');
      const balanco = Math.sin(t * 1.4) * .6;
      faceY(ctx, x + .1, y + .4, w - .2, 60, (c, len) => {
        const g = c.createRadialGradient(len / 2 - 4, 26 - 4, 2, len / 2, 26, 22);
        g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#a8781c');
        c.fillStyle = g;
        c.beginPath(); c.arc(len / 2 + balanco, 26, 21, 0, 7); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(len / 2 + balanco, 26, 9, 0, 7); c.stroke();
      });
    },

    ringLight(ctx, o, t) {
      const cx = o.x + .5, cy = o.y + .5;
      ISO.shadow(ctx, cx, cy, .4, .26);
      ISO.box(ctx, cx - .03, cy - .03, .06, .06, 70, 0, '#1b1b1c');
      const p = S(cx, cy, 86);
      ctx.save();
      ctx.strokeStyle = '#fdfbf5'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 15, 17, 0, 0, 7); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ISO.glow(ctx, p.x, p.y, 44, '#fff6e6', .28);
      ctx.restore();
    },

    vrPad(ctx, o, t) {
      const { x, y, w, d } = o;
      const acc = o.cor || '#a3e635';
      const c0 = S(x + w / 2, y + d / 2, 0.6);
      ctx.save();
      ctx.strokeStyle = ISO.rgba(acc, .6); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(c0.x, c0.y, w / 2 * ISO.HW * 1.2, d / 2 * ISO.HH * 1.2, 0, 0, 7); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = ISO.rgba(acc, .25 + .15 * Math.sin(t * 3)); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(c0.x, c0.y, w / 2 * ISO.HW, d / 2 * ISO.HH, 0, 0, 7); ctx.stroke();
      ctx.restore();
    },

    impressora3d(ctx, o, t) {
      const { x, y, w, d } = o;
      const acc = WORLD.ROOMS.inovacao.accent;
      ISO.shadow(ctx, x + w / 2, y + d / 2, .7, .28);
      ISO.box(ctx, x, y, w, d, 10, 0, '#1c1c1d');
      for (const [px, py] of [[0, 0], [w - .08, 0], [0, d - .08], [w - .08, d - .08]])
        ISO.box(ctx, x + px, y + py, .08, .08, 58, 10, '#2b2b2c');
      ISO.box(ctx, x, y, w, d, 6, 68, '#1c1c1d');
      const z = 10 + 16 + Math.sin(t * .5) * 3;
      ISO.cyl(ctx, x + w / 2, y + d / 2, .22, 14, 12, acc);
      ISO.box(ctx, x + w / 2 - .12, y + .1, .24, d - .2, 5, z + 12, '#c9c9c9');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const p = S(x + w / 2, y + d / 2, z + 10); ISO.glow(ctx, p.x, p.y, 20, '#ffffff', .4);
      ctx.restore();
    },

    quadroMovel(ctx, o) {
      const { x, y, w, d } = o;
      ISO.box(ctx, x + .1, y, .1, d, 34, 0, '#3a3a3b');
      ISO.box(ctx, x + w - .2, y, .1, d, 34, 0, '#3a3a3b');
      ISO.box(ctx, x, y, w, .1, 52, 30, '#f2f1ec');
      faceY(ctx, x + .03, y + .1, w - .06, 80, (c, len) => {
        c.fillStyle = '#f7f6f2'; c.fillRect(0, 0, len, 48);
        c.strokeStyle = '#1f5fd0'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(10, 30); c.bezierCurveTo(30, 6, 50, 40, 70, 14); c.stroke();
        c.strokeStyle = '#d8342a';
        c.strokeRect(len - 50, 8, 18, 12); c.strokeRect(len - 28, 26, 18, 12);
        c.beginPath(); c.moveTo(len - 32, 20); c.lineTo(len - 20, 26); c.stroke();
      });
    },

    /* mesa de luz da animação */
    mesaLuz(ctx, o, t) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, 1, .26);
      ISO.box(ctx, x + .1, y + .1, .12, d - .2, 26, 0, '#2a2a2b');
      ISO.box(ctx, x + w - .22, y + .1, .12, d - .2, 26, 0, '#2a2a2b');
      ISO.box(ctx, x, y, w, d, 4, 26, '#2a2a2b', { top: '#fff8e7' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const p = S(x + w / 2, y + d / 2, 32); ISO.glow(ctx, p.x, p.y, 50, '#fff3d6', .3);
      ctx.restore();
      ISO.plane(ctx, x + .4, y + .3, .9, .7, 30.2, 'rgba(255,255,255,.85)');
      ISO.plane(ctx, x + .55, y + .38, .9, .7, 30.4, 'rgba(250,250,245,.9)');
    },

    /* monitor de referência da correção de cor, de pé */
    refMonitor(ctx, o, t) {
      const { x, y, w, d } = o;
      ISO.box(ctx, x + w / 2 - .5, y, 1, d, 4, 0, '#1b1b1c');
      ISO.box(ctx, x + w / 2 - .06, y + .1, .12, .12, 40, 4, '#2a2a2b');
      ISO.box(ctx, x, y, w, .14, 58, 40, '#0c0c0d');
      faceY(ctx, x + .05, y + .14, w - .1, 96, (c, len) => {
        const h = 52;
        const cena = Math.floor(t / 5) % 2;
        if (cena === 0) {
          const barras = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
          barras.forEach((b, i) => { c.fillStyle = b; c.fillRect(i * len / 7, 0, len / 7 + 1, h * .7); });
          c.fillStyle = '#101010'; c.fillRect(0, h * .7, len, h * .3);
        } else {
          const g = c.createLinearGradient(0, 0, len, h);
          g.addColorStop(0, '#1d3b4a'); g.addColorStop(.6, '#d9895a'); g.addColorStop(1, '#2a1830');
          c.fillStyle = g; c.fillRect(0, 0, len, h);
          // metade "antes" sem cor, para mostrar o grade
          const corte = len * (.5 + .3 * Math.sin(t * .8));
          c.fillStyle = 'rgba(128,128,128,.55)'; c.fillRect(0, 0, corte, h);
          c.fillStyle = '#fff'; c.fillRect(corte, 0, 1, h);
        }
      });
    },

    pingPong(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, 2, .3);
      [[.3, .3], [w - .5, .3], [.3, d - .5], [w - .5, d - .5]]
        .forEach(p => ISO.box(ctx, x + p[0], y + p[1], .16, .16, 28, 0, '#1c1c1d'));
      ISO.box(ctx, x, y, w, d, 3, 28, '#1e3a5f', { top: '#1f4a7a' });
      ISO.plane(ctx, x + .05, y + .05, w - .1, d - .1, 31.2, null, 'rgba(255,255,255,.75)');
      ISO.plane(ctx, x + .05, y + d / 2 - .015, w - .1, .03, 31.3, 'rgba(255,255,255,.6)');
      ISO.box(ctx, x + w / 2 - .02, y - .05, .04, d + .1, 9, 31, 'rgba(240,240,240,.55)');
    },

    /* TV de chão com o videogame */
    tvPe(ctx, o, t) {
      const { x, y, w, d } = o;
      ISO.box(ctx, x, y, w, d, 16, 0, '#7f807c', { top: '#9a9b97' });
      ISO.box(ctx, x + .3, y + .1, w - .6, .12, 40, 18, '#0b0b0c');
      faceY(ctx, x + .33, y + .22, w - .66, 56, (c, len) => {
        c.fillStyle = '#0d1b2a'; c.fillRect(0, 0, len, 36);
        c.fillStyle = '#2d6a4f'; c.fillRect(0, 26, len, 10);
        const px = (t * 40) % len;
        c.fillStyle = '#fb7d4b'; c.fillRect(px, 18, 6, 8);
        c.fillStyle = '#ffd166';
        for (let i = 0; i < 4; i++) c.fillRect((i * 37 + 20 - t * 20 % 37 + len) % len, 12, 3, 3);
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = S(x + w / 2, y + .5, 38); ISO.glow(ctx, g.x, g.y, 60, '#4cc9f0', .14);
      ctx.restore();
    },

    /* banco de concreto do corredor */
    banco(ctx, o) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, w * .45, .24);
      ISO.box(ctx, x, y, w, d, 16, 0, '#8e8f8b', { top: '#a9aaa5' });
      ISO.box(ctx, x + .2, y + .1, w - .4, d - .2, 2, 16, '#6b4e36', { top: '#7d5c40' });
    },

    meetTable(ctx, o, t) {
      const { x, y, w, d } = o;
      ISO.shadow(ctx, x + w / 2, y + d / 2, 3.2, .3);
      ISO.box(ctx, x + w / 2 - .5, y + d / 2 - .4, 1, .8, 24, 0, '#1d1c1b');
      ISO.box(ctx, x, y, w, d, 4, 24, '#4a3426', { top: '#5e412d' });
      ISO.plane(ctx, x + .25, y + .25, w - .5, d - .5, TOP + .2, 'rgba(255,200,140,.06)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ISO.plane(ctx, x + w / 2 - 1.2, y + d / 2 - .5, 2.4, 1, TOP + .3,
                ISO.rgba(WORLD.C.marca, .22 + .06 * Math.sin(t * 1.4)));
      ctx.restore();
      caneca(ctx, x + 1.2, y + d / 2, TOP, 0, .8);
      caneca(ctx, x + w - 1.2, y + d / 2, TOP, 1, .8);
    }
  };

  /* ===========================================================
     PEÇAS REUTILIZADAS
     =========================================================== */

  /** caixa de som de referência em cima da mesa de edição */
  function caixinha(ctx, x, y) {
    ISO.box(ctx, x, y, .28, .34, 22, TOP, '#161617', { top: '#262628' });
    faceY(ctx, x, y + .34, .28, TOP + 22, (c, len) => {
      c.fillStyle = '#0b0b0c';
      c.beginPath(); c.arc(len / 2, 6, 3, 0, 7); c.fill();
      c.beginPath(); c.arc(len / 2, 15, 5, 0, 7); c.fill();
    });
  }

  /** painel de correção de cor: três trackballs e anéis */
  function painelCor(ctx, x, y, acc) {
    ISO.box(ctx, x, y, 2, .5, 4, TOP, '#1a1a1b', { top: '#2a2a2b' });
    for (let i = 0; i < 3; i++) {
      const p = S(x + .35 + i * .65, y + .25, TOP + 4.2);
      ctx.fillStyle = '#0d0d0e';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 8, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = ['#e5484d', '#3fbf6a', '#4c8dff'][i];
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, 4.5, 2.6, 0, 0, 7); ctx.fill();
    }
    void acc;
  }

  /** mesa digitalizadora com tela, deitada e inclinada */
  function mesaDigitalizadora(ctx, x, y, acc, t, busy) {
    ISO.box(ctx, x, y, 1.6, .6, 3, TOP, '#121213', { top: '#1d1d1e' });
    const pts = [S(x + .08, y + .06, TOP + 6), S(x + 1.52, y + .06, TOP + 6),
                 S(x + 1.52, y + .54, TOP + 3.2), S(x + .08, y + .54, TOP + 3.2)];
    ISO.quad(ctx, pts, busy ? '#f4efe4' : '#26262a');
    if (busy) {
      // o traço sendo desenhado
      const a = S(x + .3, y + .3, TOP + 4.6), b = S(x + .3 + .9 * ((t * .4) % 1), y + .25, TOP + 4.8);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2, a.y - 6, b.x, b.y); ctx.stroke();
    }
    const c = S(x + 1.3, y + .4, TOP + 6);
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + 7, c.y - 9); ctx.stroke();
    void acc;
  }

  /* O que cada departamento tem na tela quando está trabalhando.
     c = contexto já no plano da tela, len × h em px.               */
  const TELAS = {
    edi(c, len, h, t) {           // timeline de edição
      c.fillStyle = '#0e0f11'; c.fillRect(0, 0, len, h);
      c.fillStyle = '#26303a'; c.fillRect(len * .3, 1, len * .4, h * .42);
      const cores = ['#5b8def', '#e0a63c', '#3fbf6a'];
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 5; k++) {
          c.fillStyle = cores[i];
          const cx = ((k * 23 + i * 9) % (len - 10)), cw = 10 + (k * 7 + i * 5) % 14;
          c.fillRect(cx, h * .5 + i * 3.4, cw, 2.6);
        }
      c.fillStyle = '#ff4d4d';
      c.fillRect((t * 12) % len, h * .46, 1, h * .54);
    },
    cor(c, len, h, t) {           // imagem + scopes + rodas
      const g = c.createLinearGradient(0, 0, len * .6, h);
      g.addColorStop(0, '#244a5c'); g.addColorStop(1, '#d48a5a');
      c.fillStyle = g; c.fillRect(0, 0, len * .6, h * .7);
      c.fillStyle = '#0c0c0c'; c.fillRect(len * .6, 0, len * .4, h);
      c.fillStyle = 'rgba(120,255,140,.6)';
      for (let i = 0; i < 26; i++) c.fillRect(len * .62 + i * (len * .36 / 26), h * .2 + Math.abs(Math.sin(i * .7 + t)) * h * .45, 1, 1);
      c.fillStyle = '#0c0c0c'; c.fillRect(0, h * .7, len * .6, h * .3);
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = 'rgba(255,255,255,.5)';
        c.beginPath(); c.arc(len * .1 + i * len * .2, h * .85, 2.6, 0, 7); c.stroke();
      }
    },
    ani(c, len, h, t) {           // quadro de animação com bola quicando e onion skin
      c.fillStyle = '#efece4'; c.fillRect(0, 0, len, h);
      for (let k = 3; k >= 0; k--) {
        const f = ((t * 1.2) - k * .12) % 1;
        const bx = 8 + f * (len - 16), by = h - 5 - Math.abs(Math.sin(f * Math.PI * 2)) * (h - 9);
        c.fillStyle = k ? `rgba(240,120,60,${.18 / k})` : '#f07a3c';
        c.beginPath(); c.arc(bx, by, 2.4, 0, 7); c.fill();
      }
      c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(0, h - 2, len, 2);
    },
    ia(c, len, h, t) {            // grade de imagens sendo geradas
      c.fillStyle = '#081010'; c.fillRect(0, 0, len, h);
      for (let i = 0; i < 4; i++) {
        const pronto = ((t * .8) % 4) > i;
        c.fillStyle = pronto ? ISO.hsl((i * 70 + Math.floor(t * .2) * 50) % 360, 55, 45) : 'rgba(94,234,212,.12)';
        c.fillRect(3 + i * (len - 6) / 4, 3, (len - 6) / 4 - 2, h - 9);
      }
      c.fillStyle = '#5eead4'; c.fillRect(3, h - 4, (len - 6) * ((t * .2) % 1), 1.5);
    },
    fin(c, len, h, t) {           // planilha e linha de caixa
      c.fillStyle = '#0d1110'; c.fillRect(0, 0, len, h);
      c.strokeStyle = 'rgba(255,255,255,.08)';
      for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(0, i * h / 4); c.lineTo(len, i * h / 4); c.stroke(); }
      c.strokeStyle = '#3fbf6a'; c.lineWidth = 1.2;
      c.beginPath();
      for (let u = 0; u <= len; u += 6) c.lineTo(u, h * .7 - Math.sin(u * .08 + t * .3) * h * .2 - u / len * h * .25);
      c.stroke();
    },
    ven(c, len, h) {              // funil / CRM
      c.fillStyle = '#121010'; c.fillRect(0, 0, len, h);
      for (let col = 0; col < 4; col++)
        for (let k = 0; k < 3 - Math.floor(col / 2); k++) {
          c.fillStyle = col === 3 ? '#3fbf6a' : 'rgba(245,158,91,.75)';
          c.fillRect(3 + col * (len - 6) / 4, 3 + k * 6, (len - 6) / 4 - 3, 4);
        }
    },
    mkt(c, len, h, t) {           // grade de posts
      c.fillStyle = '#f5f3f0'; c.fillRect(0, 0, len, h);
      const cores = ['#f472b6', '#1f1f1f', '#fbbf24', '#60a5fa', '#ff5a1f', '#a3e635'];
      for (let i = 0; i < 6; i++) {
        c.fillStyle = cores[(i + Math.floor(t * .3)) % 6];
        c.fillRect(4 + (i % 3) * (len - 8) / 3, 2 + Math.floor(i / 3) * (h / 2), (len - 8) / 3 - 3, h / 2 - 3);
      }
    },
    ino(c, len, h, t) {           // grafo de nós
      c.fillStyle = '#0e100c'; c.fillRect(0, 0, len, h);
      const nos = [[.15, .3], [.4, .7], [.6, .25], [.85, .6]];
      c.strokeStyle = 'rgba(163,230,53,.5)';
      c.beginPath();
      nos.forEach(([a, b], i) => { if (i) c.lineTo(a * len, b * h); else c.moveTo(a * len, b * h); });
      c.stroke();
      nos.forEach(([a, b], i) => {
        c.fillStyle = i === Math.floor(t * 1.5) % 4 ? '#ffffff' : '#a3e635';
        c.beginPath(); c.arc(a * len, b * h, 2.4, 0, 7); c.fill();
      });
    }
  };


  /** monitor montado em cima da mesa, com pé e braço */
  function monitor(ctx, x, y, w, telaVisivel, busy, neon, t, o) {
    const baseZ = TOP;
    // pé
    ISO.box(ctx, x + w / 2 - .28, y + .02, .56, .3, 3, baseZ, '#12161f', { top: '#1b2130' });
    // haste
    ISO.box(ctx, x + w / 2 - .07, y + .1, .14, .14, 9, baseZ + 3, '#171c28');
    // painel
    const pz = baseZ + 8, ph = 26;
    ISO.box(ctx, x, y, w, .13, ph, pz, '#0b0e17', { top: '#1a2030' });

    faceY(ctx, x + .03, y + .13, w - .06, pz + ph - 2, (c, len) => {
      if (telaVisivel) {
        c.fillStyle = '#04060d'; c.fillRect(0, 0, len, ph - 4);
        if (busy && o && TELAS[o.v]) {
          TELAS[o.v](c, len, ph - 4, t, neon);
        } else if (busy) {
          // linhas de texto rolando
          for (let i = 0; i < 6; i++) {
            const ly = 3 + ((i * 3.6 + (t * 9) % 3.6));
            if (ly > ph - 6) continue;
            const lw = (len - 16) * (.25 + .6 * Math.abs(Math.sin(i * 3.7 + Math.floor(t * 2))));
            c.fillStyle = ISO.rgba(i % 3 ? '#8ef0c0' : neon, .62);
            c.fillRect(8, ly, lw, 1.6);
          }
          c.fillStyle = ISO.rgba(neon, .9);
          c.fillRect(8, ph - 8, 3, 1.8);
        } else {
          c.fillStyle = ISO.rgba(neon, .1); c.fillRect(0, 0, len, ph - 4);
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = "700 8px 'Barlow', sans-serif";
          c.fillStyle = ISO.rgba(neon, .5);
          c.fillText('●', len / 2, (ph - 4) / 2);
        }
      } else {
        // costas do monitor: nada de tela acesa
        const g = c.createLinearGradient(0, 0, 0, ph - 4);
        g.addColorStop(0, '#242a38'); g.addColorStop(1, '#161b26');
        c.fillStyle = g; c.fillRect(0, 0, len, ph - 4);
        c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
          c.beginPath(); c.moveTo(i * len / 6, 4); c.lineTo(i * len / 6, ph - 8); c.stroke();
        }
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = "700 7px 'Barlow', sans-serif";
        c.fillStyle = 'rgba(190,200,225,.35)';
        c.fillText('●', len / 2, (ph - 4) / 2);
      }
    });

    // brilho fino na moldura de cima
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ISO.quad(ctx, [S(x, y + .13, pz + ph), S(x + w, y + .13, pz + ph),
                   S(x + w, y + .13, pz + ph - 2), S(x, y + .13, pz + ph - 2)],
             ISO.rgba(neon, telaVisivel ? .6 : .3));
    if (telaVisivel && busy) {
      const gc = S(x + w / 2, y + .3, pz + ph / 2);
      ISO.glow(ctx, gc.x, gc.y, 58, neon, .26);
    }
    ctx.restore();
    void o;
  }

  /** monitor com o painel correndo no eixo Y (mesa de lado) */
  function monitorY(ctx, x, y, alt, telaVisivel, busy, neon, t) {
    const cy = y + alt / 2;
    ISO.box(ctx, x + .02, cy - .28, .3, .56, 3, TOP, '#12161f', { top: '#1b2130' });
    ISO.box(ctx, x + .1,  cy - .07, .14, .14, 9, TOP + 3, '#171c28');

    const pz = TOP + 8, ph = 26;
    // painel fino em X, largo em Y: a tela aponta para -x quando face 'e'
    ISO.box(ctx, x, y, .13, alt, ph, pz, '#0b0e17', { top: '#1a2030' });

    // a face que a câmera enxerga é a +x
    const T = ISO.TW;
    const o = ISO.toScreen(x + .13, y, pz + ph - 2);
    ctx.save();
    ctx.transform(-ISO.HW / T, ISO.HH / T, 0, 1, o.x, o.y);
    const len = alt * T;
    if (telaVisivel) {
      ctx.fillStyle = '#04060d'; ctx.fillRect(-len, 0, len, ph - 4);
      if (busy) {
        for (let i = 0; i < 6; i++) {
          const ly = 3 + ((i * 3.6 + (t * 9) % 3.6));
          if (ly > ph - 6) continue;
          const lw = (len - 16) * (.25 + .6 * Math.abs(Math.sin(i * 3.7 + Math.floor(t * 2))));
          ctx.fillStyle = ISO.rgba(i % 3 ? '#8ef0c0' : neon, .62);
          ctx.fillRect(-len + 8, ly, lw, 1.6);
        }
      } else {
        ctx.fillStyle = ISO.rgba(neon, .1); ctx.fillRect(-len, 0, len, ph - 4);
      }
    } else {
      // costas do monitor: chapa escura com respiros, nada de tela acesa
      const g = ctx.createLinearGradient(0, 0, 0, ph - 4);
      g.addColorStop(0, '#242a38'); g.addColorStop(1, '#161b26');
      ctx.fillStyle = g; ctx.fillRect(-len, 0, len, ph - 4);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(-i * len / 6, 4); ctx.lineTo(-i * len / 6, ph - 8); ctx.stroke();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = "700 7px 'Barlow', sans-serif";
      ctx.fillStyle = 'rgba(190,200,225,.35)';
      ctx.fillText('●', -len / 2, (ph - 4) / 2);
    }
    ctx.restore();

    // luz da tela vazando pelas bordas — dá para ver que está ligado
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ISO.quad(ctx, [S(x + .13, y, pz + ph), S(x + .13, y + alt, pz + ph),
                   S(x + .13, y + alt, pz + ph - 2), S(x + .13, y, pz + ph - 2)],
             ISO.rgba(neon, busy ? .6 : .3));
    if (busy) {
      const gc = S(x - .1, cy, pz + ph / 2);
      ISO.glow(ctx, gc.x, gc.y, 60, neon, .26);
    }
    ctx.restore();
  }

  /** teclado deitado no eixo Y */
  function tecladoY(ctx, x, y, neon) {
    ISO.plane(ctx, x - .06, y - .08, .56, 2.05, TOP + .05, ISO.rgba(neon, .2));
    ISO.box(ctx, x, y, .36, 1.45, 3, TOP, '#141822', { top: '#232a38' });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ISO.plane(ctx, x + .04, y + .04, .28, 1.37, TOP + 3.2, ISO.rgba(neon, .33));
    ctx.restore();
    ISO.box(ctx, x + .06, y + 1.62, .26, .2, 3.5, TOP, '#1b2130');
  }

  function teclado(ctx, x, y, neon) {
    ISO.plane(ctx, x - .08, y - .06, 2.05, .56, TOP + .05, ISO.rgba(neon, .2));
    ISO.box(ctx, x, y, 1.45, .36, 3, TOP, '#141822', { top: '#232a38' });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ISO.plane(ctx, x + .04, y + .04, 1.37, .28, TOP + 3.2, ISO.rgba(neon, .33));
    ctx.restore();
    ISO.box(ctx, x + 1.62, y + .06, .2, .26, 3.5, TOP, '#1b2130');
  }

  /** gabinete em cima da mesa, com painel de vidro e RGB */
  function gabinete(ctx, x, y, neon, t) {
    ISO.box(ctx, x, y, .42, .78, 30, TOP, '#11141d', { top: '#1d2431' });
    faceY(ctx, x, y + .78, .42, TOP + 30, (c, len) => {
      c.fillStyle = 'rgba(8,11,20,.9)'; c.fillRect(2, 3, len - 4, 24);
      for (let i = 0; i < 3; i++) {
        c.fillStyle = ISO.rgba(ISO.hsl((t * 60 + i * 60) % 360, 92, 58), .55);
        c.fillRect(4, 6 + i * 7, len - 8, 3.4);
      }
    });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = S(x + .21, y + .39, TOP + 15);
    ISO.glow(ctx, g.x, g.y, 30, neon, .22);
    ctx.restore();
  }

  /**
   * Cadeira gamer no estilo da Hawker (Westwing) que o usuário mandou:
   * concha com bolsters laterais, encosto alto com "asas", almofadas de
   * cabeça e lombar, braços acolchoados e base estrela de 5 pontas.
   * Centrada no lugar do boneco; encosto do lado oposto ao que ele encara.
   * Assento com topo em z=15, casando com AVATAR.SEAT.
   */
  /**
   * Cadeira gamer, em DUAS camadas.
   *
   * Quando o boneco está de costas para a câmera ('n' e 'w'), a cadeira fica
   * entre ele e nós: aí tudo do assento para cima é pintado DEPOIS dele, e a
   * cadeira tapa de verdade as pernas e as costas. Antes ela era pintada toda
   * antes do boneco e parecia translúcida.
   * Quando ele está de frente ('s' e 'e'), a cadeira inteira vai atrás.
   */
  function cadeiraBase(ctx, o, cor, accent, altEncosto, gamer) {
    // o boneco é desenhado em AVATAR.SCALE, então o assento precisa subir junto
    const ESC     = AVATAR.SCALE;
    const ASSENTO = AVATAR.SEAT * ESC;  // topo do assento = quadril sentado
    const { x, y, w, d } = o;
    const f      = o.face || 'n';
    const camada = o.camada || 'tras';
    const costasNaFrente = (f === 'n' || f === 'w');

    const corD = ISO.shade(cor, -.24);
    const corL = ISO.shade(cor, .14);
    const trim = gamer ? ISO.shade(cor, .19) : ISO.shade(cor, .14);
    const cx = x + w / 2, cy = y + d / 2;
    const eixoX = (f === 'e' || f === 'w');
    const H = altEncosto * ESC;

    /* fatia paralela ao encosto: a0..a1 ao longo da largura,
       esp = espessura, rec = recuo a partir da borda de trás */
    const seg = (a0, a1, esp, rec) =>
      f === 'n' ? [x + w * a0, y + d - rec - esp, w * (a1 - a0), esp]
    : f === 's' ? [x + w * a0, y + rec,           w * (a1 - a0), esp]
    : f === 'e' ? [x + rec,          y + d * a0,  esp, d * (a1 - a0)]
    :             [x + w - rec - esp, y + d * a0, esp, d * (a1 - a0)];
    const bx = (s, h, z, c, opt) => ISO.box(ctx, s[0], s[1], s[2], s[3], h, z, c, opt);

    /* De costas, a cadeira INTEIRA (inclusive a base) vai na frente dele:
       é ela que esconde as pernas e os pés, como aconteceria de verdade.
       Só a sombra fica atrás. De frente, a cadeira inteira fica atrás.    */
    if (camada === 'tras') {
      ISO.shadow(ctx, cx, cy, .68, .28);
      if (costasNaFrente) return;
    } else if (!costasNaFrente) {
      return;
    }

    /* ---------- base estrela de 5 pontas + rodízios ---------- */
    {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + .35;
        const ex = cx + Math.cos(a) * w * .36, ey = cy + Math.sin(a) * d * .36;
        ISO.box(ctx, (cx + ex) / 2 - .075, (cy + ey) / 2 - .075, .15, .15, 3, 1, '#1b1f29');
        ISO.cyl(ctx, ex, ey, .07, 4, 0, '#39415a');
      }
      ISO.cyl(ctx, cx, cy, .14, 4, 3, '#272d3b');
      ISO.cyl(ctx, cx, cy, .075, ASSENTO - 7, 6, '#8e97ab');   // pistão cromado
    }

    /* ---------- assento tipo concha ---------- */
    ISO.box(ctx, x + .1, y + .1, w - .2, d - .2, 5, ASSENTO - 6, cor, { top: corL });
    if (eixoX) {
      ISO.box(ctx, x + .08, y + .04, w - .16, .15, 4, ASSENTO - 2, corD);
      ISO.box(ctx, x + .08, y + d - .19, w - .16, .15, 4, ASSENTO - 2, corD);
    } else {
      ISO.box(ctx, x + .04, y + .08, .15, d - .16, 4, ASSENTO - 2, corD);
      ISO.box(ctx, x + w - .19, y + .08, .15, d - .16, 4, ASSENTO - 2, corD);
    }
    ISO.plane(ctx, x + .24, y + .24, w - .48, d - .48, ASSENTO + .1, ISO.rgba(accent, .16));

    /* ---------- encosto ---------- */
    const estofado = () => {
      const est = seg(.24, .76, .05, .53);
      ISO.box(ctx, est[0], est[1], est[2], est[3], H * .8, ASSENTO + 3, trim);
    };
    const painel = () => {
      bx(seg(.03, .97, .18, .34), H, ASSENTO, cor, { top: corL });
      bx(seg(-.02, .20, .32, .30), H * .74, ASSENTO, corD);
      bx(seg(.80, 1.02, .32, .30), H * .74, ASSENTO, corD);
      if (costasNaFrente) {
        // costas viradas para a câmera: casca preta, com costura e placa
        bx(seg(.03, .97, .185, .325), H, ASSENTO, '#0a0c12', { top: '#161a24' });
        const cst = seg(.46, .54, .2, .32);
        ISO.box(ctx, cst[0], cst[1], cst[2], cst[3], H * .92, ASSENTO, '#05070b');
        const plc = seg(.34, .66, .205, .318);
        ISO.box(ctx, plc[0], plc[1], plc[2], plc[3], H * .1, ASSENTO + H * .56, '#20252f');
      }
    };
    if (costasNaFrente) { estofado(); painel(); }
    else                { painel();  estofado(); }

    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const tp = seg(.03, .97, .18, .34);
    ISO.plane(ctx, tp[0], tp[1], tp[2], tp[3], ASSENTO + H, ISO.rgba(accent, .34));
    ctx.restore();

    /* ---------- braços ---------- */
    if (gamer) {
      const br = eixoX
        ? [[x + .1, y + .0, w - .2, .14], [x + .1, y + d - .14, w - .2, .14]]
        : [[x + .0, y + .1, .14, d - .2], [x + w - .14, y + .1, .14, d - .2]];
      for (const a of br) {
        ISO.box(ctx, a[0], a[1], a[2], a[3], 6, ASSENTO, '#1d2230');
        ISO.box(ctx, a[0] - .02, a[1] - .02, a[2] + .04, a[3] + .04, 3, ASSENTO + 6, corD, { top: corL });
      }
    }
  }

  /** tufo de folhas largas, de trás para a frente */
  function folhagem(ctx, b, sz, seed) {
    const n = 13;
    const cores = ['#1f5e31', '#2d7a40', '#3a9450', '#4aa85e'];
    for (let camada = 0; camada < 2; camada++)
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const a = -Math.PI / 2 + (f - .5) * (camada ? 2.2 : 3.0) + Math.sin(seed + i * 2.3) * .12;
        const L = (camada ? 24 : 30) * sz * (.75 + .35 * Math.abs(Math.sin(seed * .7 + i)));
        const cx = b.x + Math.cos(a) * L * .55, cy = b.y + Math.sin(a) * L * .55 - 4 * sz;
        ctx.fillStyle = cores[(i + camada * 2 + Math.abs(seed)) % 4];
        ctx.beginPath(); ctx.ellipse(cx, cy, L * .5, L * .14, a, 0, Math.PI * 2); ctx.fill();
      }
  }

  function dispenser(ctx, cx, cy, color, t) {
    ISO.cyl(ctx, cx, cy, .22, 8, 46, '#cfd6e8');
    ISO.cyl(ctx, cx, cy, .26, 34, 54, 'rgba(190,215,255,.22)');
    ISO.cyl(ctx, cx, cy, .23, 22 + Math.sin(t * 1.5) * 1.6, 54, ISO.rgba(color, .82));
    ISO.cyl(ctx, cx, cy, .2, 8, 88, '#e5ebf7');
    ISO.cyl(ctx, cx, cy, .1, 9, 96, '#e5ebf7');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const p = S(cx, cy, 70); ISO.glow(ctx, p.x, p.y, 40, color, .22);
    ctx.restore();
  }

  return { items, workSlots, restSlots, meetSlots, drawItem, depth, caneca, TOP };
})();
