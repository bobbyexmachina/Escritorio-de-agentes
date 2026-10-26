/* ===========================================================
   world.js — a planta do andar da Ovelha Rocks
   Grade 64 x 46.  Três faixas de salas, dois corredores e um hall
   vertical. Concreto aparente, vidro e uma linha de luz por sala.

        x →
     y  ┌ DIRETORIA ┬ REUNIÕES ┬ CINEMA ─────┬ ESTÚDIO IA ───────┐
     ↓  ├─────────────────── corredor ─────────────── recepção ▸ elevador
        ├ FINANC. ┬ VENDAS ┬ MARKETING ┐hall┌ FUNCIONÁRIOS ─────┤
        ├─────────────────── corredor ─────────────────────────────┤
        └ INOVAÇÃO ┴ ANIMAÇÃO ┴ EDIÇÃO ┴ COR ┴ SALA DE JOGOS ─────┘
   =========================================================== */
const WORLD = (() => {

  const W = 64, H = 46;

  const VOID = 0, FLOOR = 1, WALL = 2, DOOR = 3;

  const E = window.ESCRITORIO || {};

  /* ---------- paleta: concreto, vidro e a cor da marca ---------- */
  const C = {
    marca:   E.cor || '#7628f1',
    luz:     '#ffa940',                 // a luz âmbar que banha o andar
    dark:    '#141516',
    wall:    '#635e58', wallTop: '#857f78',
    junta:   'rgba(0,0,0,.16)'
  };

  /* ---------- salas ----------
     bx/by/bw/bh = caixa com as paredes; x1..x2 / y1..y2 = piso útil.
     Salas vizinhas dividem a mesma parede.                          */
  const sala = (id, name, short, bx, by, bw, bh, accent, floorA, floorB, desc) => ({
    id, name, short, bx, by, bw, bh,
    x1: bx + 1, y1: by + 1, x2: bx + bw - 2, y2: by + bh - 2,
    accent, floorA, floorB, desc
  });

  const ROOMS = {
    diretoria:    sala('diretoria', 'DIRETORIA', 'Diretoria', 0, 0, 16, 14, C.marca,
                       '#2b2420', '#2f2823',
                       'Sala do sócio. Piso de madeira escura, prêmios de 15 anos de estrada e a agenda da produtora.'),
    reuniao:      sala('reuniao', 'SALA DE REUNIÕES', 'Reuniões', 15, 0, 14, 14, '#e8e4dc',
                       '#3a3b3a', '#3e3f3e',
                       'Mesa de oito lugares e tela de apresentação. É aqui que os agentes se reúnem.'),
    cinema:       sala('cinema', 'SALA DE EXIBIÇÃO', 'Cinema', 28, 0, 17, 14, '#e5484d',
                       '#1d1718', '#211a1b',
                       'Tela grande, som de cinema e três fileiras de poltronas para aprovar cortes com o cliente.'),
    ia:           sala('ia', 'ESTÚDIO DE IA', 'Estúdio IA', 44, 0, 20, 14, '#5eead4',
                       '#2c3131', '#303535',
                       'Criação de vídeos com Inteligência Artificial: estações com três telas, mesa holográfica e servidores de GPU.'),

    financeiro:   sala('financeiro', 'FINANCEIRO', 'Financeiro', 0, 17, 12, 13, '#d4b670',
                       '#3a3a38', '#3e3e3c',
                       'Fluxo de caixa, contratos e faturamento. Arquivo e cofre.'),
    vendas:       sala('vendas', 'VENDAS', 'Vendas', 11, 17, 12, 13, '#f59e5b',
                       '#3b3937', '#3f3d3b',
                       'Comercial e atendimento a clientes. Painel de metas e o gongo de contrato fechado.'),
    marketing:    sala('marketing', 'MARKETING', 'Marketing', 22, 17, 12, 13, '#f472b6',
                       '#3b383a', '#3f3c3e',
                       'Conteúdo, redes sociais e posicionamento da marca. Moodboard e ring light.'),
    funcionarios: sala('funcionarios', 'SALA DOS FUNCIONÁRIOS', 'Funcionários', 36, 17, 28, 13, '#a5b4c8',
                       '#393a3b', '#3d3e3f',
                       'Área aberta da equipe: dez estações de trabalho em ilhas.'),

    inovacao:     sala('inovacao', 'INOVAÇÃO', 'Inovação', 0, 33, 13, 13, '#a3e635',
                       '#363a35', '#3a3e39',
                       'Laboratório: impressora 3D, área de realidade virtual e o quadro de ideias em teste.'),
    animacao:     sala('animacao', 'ANIMAÇÃO 2D & MOTION', 'Animação', 12, 33, 14, 13, '#fbbf24',
                       '#3a3834', '#3e3c38',
                       'Animação 2D e motion graphics: mesas com tela de desenho e mesa de luz.'),
    edicao:       sala('edicao', 'EDIÇÃO', 'Edição', 25, 33, 12, 13, '#60a5fa',
                       '#252729', '#292b2d',
                       'Ilhas de edição com duas telas e caixas de referência, e sofá para o cliente acompanhar o corte.'),
    cor:          sala('cor', 'CORREÇÃO DE COR', 'Cor', 36, 33, 11, 13, '#c084fc',
                       '#2e2e2e', '#313131',
                       'Sala de color grading: piso e paredes neutros, painel de cor e monitor de referência.'),
    jogos:        sala('jogos', 'SALA DE JOGOS', 'Jogos', 46, 33, 18, 13, '#fb7d4b',
                       '#2f2b2e', '#332f32',
                       'Fliperama, sinuca, pingue-pongue, pebolim, videogame e bar.'),

    corredor: {
      id: 'corredor', name: 'RECEPÇÃO & CIRCULAÇÃO', short: 'Corredor',
      accent: '#8a8c8a',
      floorA: '#454644', floorB: '#484947',
      desc: 'Recepção, elevador e os corredores de concreto entre as salas.'
    }
  };

  /* pisos: madeira escura onde se recebe gente, concreto quente no resto */
  const PISOS = {
    diretoria: ['#3d2a1e', '#432f22', true], reuniao: ['#3a2a20', '#3f2e23', true],
    cinema: ['#1c1418', '#1f161a'], ia: ['#24232a', '#27262d'],
    financeiro: ['#2e2b28', '#322f2b'], vendas: ['#2e2b28', '#322f2b'],
    marketing: ['#2e2b28', '#322f2b'], funcionarios: ['#2e2b28', '#322f2b'],
    inovacao: ['#2c2b27', '#302f2a'], animacao: ['#2e2b28', '#322f2b'],
    edicao: ['#232224', '#262527'], cor: ['#2b2b2b', '#2e2e2e'],
    jogos: ['#3a2a20', '#3f2e23', true], corredor: ['#34312d', '#37342f']
  };
  for (const [id, [a, b, madeira]] of Object.entries(PISOS))
    Object.assign(ROOMS[id], { floorA: a, floorB: b, madeira: !!madeira });

  /** ordem em que as salas aparecem no painel */
  const ORDEM = ['diretoria', 'reuniao', 'cinema', 'ia', 'financeiro', 'vendas', 'marketing',
                 'funcionarios', 'inovacao', 'animacao', 'edicao', 'cor', 'jogos', 'corredor'];

  /* ---------- portas (x, y, orientação) ---------- */
  const porta = (x, y, o) => [{ x, y, o }, o === 'h' ? { x: x + 1, y, o } : { x, y: y + 1, o }];
  const DOORS = [
    ...porta(7, 13, 'h'),  ...porta(21, 13, 'h'), ...porta(36, 13, 'h'), ...porta(53, 13, 'h'),
    ...porta(5, 17, 'h'),  ...porta(16, 17, 'h'), ...porta(27, 17, 'h'), ...porta(42, 17, 'h'),
    ...porta(36, 23, 'v'), ...porta(55, 29, 'h'),
    ...porta(6, 33, 'h'),  ...porta(18, 33, 'h'), ...porta(30, 33, 'h'), ...porta(43, 33, 'h'),
    ...porta(54, 33, 'h'),
    ...porta(36, 38, 'v')                                  // edição <-> cor
  ];

  /* ---------- grade ---------- */
  const kind   = new Uint8Array(W * H);
  const roomOf = new Array(W * H).fill(null);
  const blocked = new Uint8Array(W * H);   // móveis ocupando o tile

  const idx = (x, y) => y * W + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  function buildGrid() {
    kind.fill(FLOOR);
    for (let i = 0; i < W * H; i++) roomOf[i] = 'corredor';

    // casca do prédio
    for (let x = 0; x < W; x++) { kind[idx(x, 0)] = WALL; kind[idx(x, H - 1)] = WALL; }
    for (let y = 0; y < H; y++) { kind[idx(0, y)] = WALL; kind[idx(W - 1, y)] = WALL; }

    // primeiro o piso de todas as salas, depois as paredes: assim uma
    // parede dividida nunca é apagada pelo piso da sala vizinha
    const salas = Object.values(ROOMS).filter(r => r.bw !== undefined);
    for (const r of salas)
      for (let x = r.x1; x <= r.x2; x++)
        for (let y = r.y1; y <= r.y2; y++) { kind[idx(x, y)] = FLOOR; roomOf[idx(x, y)] = r.id; }
    for (const r of salas) {
      const x0 = r.bx, y0 = r.by, x1 = r.bx + r.bw - 1, y1 = r.by + r.bh - 1;
      for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++) {
          if (!inside(x, y)) continue;
          if (x === x0 || x === x1 || y === y0 || y === y1) {
            kind[idx(x, y)] = WALL;
            if (roomOf[idx(x, y)] === 'corredor') roomOf[idx(x, y)] = r.id;
          }
        }
    }

    for (const d of DOORS) if (inside(d.x, d.y)) kind[idx(d.x, d.y)] = DOOR;
  }
  buildGrid();

  const kindAt  = (x, y) => inside(x, y) ? kind[idx(x, y)] : VOID;
  const roomAt  = (x, y) => inside(x, y) ? roomOf[idx(x, y)] : null;
  const isWall  = (x, y) => kindAt(x, y) === WALL;

  /** o tile dá para pisar? (usado pelo A*) */
  function walkable(x, y) {
    if (!inside(x, y)) return false;
    const k = kind[idx(x, y)];
    return (k === FLOOR || k === DOOR) && !blocked[idx(x, y)];
  }
  function setBlocked(x, y, v = 1) {
    if (inside(x, y)) blocked[idx(x, y)] = v;
  }

  /* ---------- alturas de parede ----------
     Uma parede que tem chão ATRÁS dela (em x-1 ou y-1) taparia
     a visão: ela vira mureta de concreto + vidro por cima.
     As de fundo (norte e oeste) sobem inteiras, em concreto aparente. */
  const WALL_H = 108, PARAPET = 40;

  function wallOccludes(x, y) {
    const a = kindAt(x - 1, y), b = kindAt(x, y - 1);
    return a === FLOOR || a === DOOR || b === FLOOR || b === DOOR;
  }

  /* ---------- painéis nas paredes altas ---------- */
  const SIGNS = [
    { o: 'n', x: 8,  y: 0,  len: 7,  kind: 'logo'       },  // diretoria: a marca (janelas à esquerda)
    { o: 'w', x: 0,  y: 1,  len: 5,  kind: 'quadro'     },  // diretoria: ideias
    { o: 'w', x: 0,  y: 7,  len: 6,  kind: 'eventos'    },  // diretoria: agenda
    { o: 'n', x: 17, y: 0,  len: 2,  kind: 'logoMini'   },  // reunião
    { o: 'n', x: 30, y: 0,  len: 13, kind: 'cinema'     },  // a tela de cinema
    { o: 'n', x: 46, y: 0,  len: 7,  kind: 'ia'         },  // estúdio de IA
    { o: 'n', x: 54, y: 0,  len: 7,  kind: 'equipe'     },  // a equipe agora
    { o: 'w', x: 0,  y: 19, len: 8,  kind: 'financeiro' },  // fluxo de caixa
    { o: 'w', x: 0,  y: 35, len: 8,  kind: 'inovacao'   }   // quadro do laboratório
  ];

  /* ===========================================================
     DESENHO
     =========================================================== */

  /** superfície de parede em espaço "u (px ao longo) × v (px para baixo)" */
  function wallFace(ctx, orient, x, y, lenTiles, topZ, fn) {
    const T = ISO.TW;
    let o, a, b;
    if (orient === 'n') {                       // face virada para +y
      o = ISO.toScreen(x, y + 1, topZ);
      a =  ISO.HW / T; b =  ISO.HH / T;
    } else {                                    // 'w' — face virada para +x
      // começa na ponta de baixo e cresce subindo à direita;
      // pelo outro lado o texto sairia espelhado
      o = ISO.toScreen(x + 1, y + lenTiles, topZ);
      a =  ISO.HW / T; b = -ISO.HH / T;
    }
    ctx.save();
    ctx.transform(a, b, 0, 1, o.x, o.y);
    fn(ctx, lenTiles * T);
    ctx.restore();
  }

  /* ---- textura de concreto aparente ----
     Fôrma de tábua (linhas horizontais), furos de tirante e grão.
     Pintada uma vez por orientação e copiada em cada face.        */
  const texturas = {};
  function texturaConcreto(o) {
    if (texturas[o]) return texturas[o];
    const T = ISO.TW;
    const cv = document.createElement('canvas');
    cv.width = T; cv.height = WALL_H;
    const c = cv.getContext('2d');
    const sh = o === 'n' ? -0.04 : -0.3;
    const g = c.createLinearGradient(0, 0, 0, WALL_H);
    g.addColorStop(0, ISO.shade(C.wall, sh + 0.08));
    g.addColorStop(1, ISO.shade(C.wall, sh - 0.3));
    c.fillStyle = g; c.fillRect(0, 0, T, WALL_H);

    // grão: pontinhos claros e escuros, sempre os mesmos
    let s = o === 'n' ? 7 : 13;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 140; i++) {
      c.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)';
      c.fillRect(rnd() * T, rnd() * WALL_H, 1 + rnd() * 1.5, 1);
    }
    // marcas da fôrma de tábua
    for (let v = 13; v < WALL_H; v += 13) {
      c.fillStyle = 'rgba(0,0,0,.13)'; c.fillRect(0, v, T, 1);
      c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(0, v + 1, T, 1);
    }
    // junta vertical entre painéis e furos de tirante
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(T - 1, 0, 1, WALL_H);
    for (const [u, v] of [[16, 32], [48, 32], [16, 84], [48, 84]]) {
      c.fillStyle = 'rgba(0,0,0,.32)';
      c.beginPath(); c.arc(u, v, 1.8, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.08)';
      c.beginPath(); c.arc(u + .6, v + .8, 1.2, 0, 7); c.fill();
    }
    texturas[o] = cv;
    return cv;
  }

  /* ---- janelas: a cidade à noite atrás do concreto ----
     As paredes altas (norte e oeste) viram vãos de vidro do piso ao teto,
     com um pilar de concreto a cada seis módulos. Onde há painel, tela ou
     a sala de cinema, a parede continua cega.                            */
  function temJanela(x, y, o) {
    if (o === 'n' ? (x % 6 === 0 || x === 0 || x === W - 1) : (y % 6 === 0 || y === 0 || y === H - 1)) return false;
    const sala = roomOf[idx(o === 'n' ? x : x + 1, o === 'n' ? y + 1 : y)];
    if (sala === 'cinema') return false;
    return !SIGNS.some(s => s.o === o && (o === 'n'
      ? (s.y === y && x >= s.x - 1 && x <= s.x + s.len)
      : (s.x === x && y >= s.y - 1 && y <= s.y + s.len)));
  }
  const janelas = {};
  function texturaJanela(o, v) {
    const ck = o + v;
    if (janelas[ck]) return janelas[ck];
    const T = ISO.TW, cv = document.createElement('canvas');
    cv.width = T; cv.height = WALL_H;
    const c = cv.getContext('2d');
    const y0 = 10, y1 = WALL_H - 14;
    // céu noturno com o roxo da marca no horizonte
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#07081a'); g.addColorStop(.65, '#1a1438'); g.addColorStop(1, '#3b2350');
    c.fillStyle = g; c.fillRect(0, y0, T, y1 - y0);
    let sd = 17 + v * 31 + (o === 'n' ? 0 : 7);
    const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
    // estrelas
    c.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 4; i++) c.fillRect(rnd() * T, y0 + rnd() * 26, 1, 1);
    // prédios ao fundo e à frente, com janelas acesas
    for (const [cor, alto, ac] of [['#141428', 30, .35], ['#0c0c1c', 50, .8]]) {
      let u = -rnd() * 10;
      while (u < T) {
        const bw = 8 + rnd() * 14, bh = 12 + rnd() * alto;
        c.fillStyle = cor; c.fillRect(u, y1 - bh, bw, bh);
        for (let wy = y1 - bh + 3; wy < y1 - 3; wy += 4)
          for (let wx = u + 2; wx < u + bw - 2; wx += 3)
            if (rnd() > .62) {
              c.fillStyle = rnd() > .3 ? `rgba(255,190,110,${ac})` : `rgba(200,180,255,${ac})`;
              c.fillRect(wx, wy, 1.4, 1.6);
            }
        u += bw + 1 + rnd() * 3;
      }
    }
    // reflexo no vidro e sombra do lado oeste
    c.fillStyle = 'rgba(255,255,255,.05)';
    c.beginPath(); c.moveTo(T * .2, y0); c.lineTo(T * .55, y0); c.lineTo(T * .15, y1); c.lineTo(0, y1); c.lineTo(0, y0 + 20); c.closePath(); c.fill();
    if (o === 'w') { c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, y0, T, y1 - y0); }
    // caixilho preto: travessas e montante
    c.fillStyle = '#111114';
    c.fillRect(0, y0, T, 2); c.fillRect(0, y1 - 2, T, 2); c.fillRect(0, y0, 2, y1 - y0);
    c.fillRect(0, y0 + (y1 - y0) * .62, T, 1.5);
    // peitoril com luz âmbar embutida
    c.fillStyle = ISO.rgba(C.luz, .55); c.fillRect(0, y1, T, 1.5);
    janelas[ck] = cv;
    return cv;
  }

  /* ---- chão ----
     O piso é fixo: ele é pintado uma vez num canvas próprio e depois só
     copiado. Concreto polido com juntas de dilatação a cada 4 tiles e
     poças de luz das luminárias de teto já assadas nele.              */
  let pisoCache = null;
  function montaPiso() {
    const x0 = ISO.toScreen(0, H - 1).x - ISO.TW;
    const x1 = ISO.toScreen(W - 1, 0).x + ISO.TW;
    const y0 = ISO.toScreen(0, 0).y - 4;
    const y1 = ISO.toScreen(W - 1, H - 1).y + ISO.TH + 4;
    const cv = document.createElement('canvas');
    cv.width  = Math.ceil(x1 - x0);
    cv.height = Math.ceil(y1 - y0);
    const c = cv.getContext('2d');
    c.translate(-x0, -y0);

    const P = ISO.toScreen;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = kind[idx(x, y)];
        if (k !== FLOOR && k !== DOOR) continue;
        const r = ROOMS[roomOf[idx(x, y)]] || ROOMS.corredor;
        let col = ((x * 7 + y * 13) % 5 === 0) ? r.floorB : r.floorA;
        if (k === DOOR) col = ISO.shade(r.floorA, -0.25);
        ISO.tile(c, x, y, col);
      }
    }
    // juntas de dilatação
    c.strokeStyle = C.junta; c.lineWidth = 1;
    c.beginPath();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = kind[idx(x, y)];
      if (k !== FLOOR && k !== DOOR) continue;
      if (x % 4 === 0) { const a = P(x, y), b = P(x, y + 1); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
      if (y % 4 === 0) { const a = P(x, y), b = P(x + 1, y); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    }
    c.stroke();
    // salas de piso de madeira: réguas finas
    c.strokeStyle = 'rgba(0,0,0,.2)';
    c.beginPath();
    for (const d of Object.values(ROOMS)) {
      if (!d.madeira) continue;
      for (let x = d.x1; x <= d.x2 + 1; x += 0.5) {
        const a = P(x, d.y1), b = P(x, d.y2 + 1); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
      }
    }
    c.stroke();

    // faixa guia da marca nos corredores
    c.save();
    c.strokeStyle = ISO.rgba(C.luz, .35); c.lineWidth = 2;
    c.beginPath();
    for (const yy of [15.5, 31.5]) {
      const a = P(1.5, yy), b = P(W - 1.5, yy); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
    }
    const a = P(34.9, 16.5), b = P(34.9, 30.5); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
    c.stroke();
    c.restore();

    // luz de teto: uma poça quente no meio de cada sala clara
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const r of Object.values(ROOMS)) {
      if (r.bw === undefined || r.id === 'cinema') continue;
      for (let lx = r.x1 + 2.5; lx < r.x2; lx += 6) {
        for (let ly = r.y1 + 2.5; ly < r.y2; ly += 5) {
          const p = P(lx, ly);
          ISO.glow(c, p.x, p.y, 130, '#ffc77a', .085);
        }
      }
    }
    for (let lx = 4; lx < W - 2; lx += 8) {
      for (const ly of [15.5, 31.5]) { const p = P(lx, ly); ISO.glow(c, p.x, p.y, 100, '#ffc77a', .07); }
    }
    c.restore();

    pisoCache = { cv, x: x0, y: y0 };
  }

  function drawFloor(ctx, t) {
    if (!pisoCache) montaPiso();
    ctx.drawImage(pisoCache.cv, pisoCache.x, pisoCache.y);

    // o que é vivo no piso: a luz da tela de cinema e o pulso do estúdio de IA
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tela = ISO.toScreen(36.5, 4);
    const cor = corFilme(t);
    ISO.glow(ctx, tela.x, tela.y, 260, cor, .1 + .03 * Math.sin(t * 1.7));
    const ia = ROOMS.ia;
    const pi = ISO.toScreen(57.5, 8);
    ISO.glow(ctx, pi.x, pi.y, 150, ia.accent, .06 + .04 * (Math.sin(t * 1.3) + 1) / 2);
    ctx.restore();
  }

  /* ---- rótulo de cada sala, pintado no piso ---- */
  function drawRoomLabels(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 13px Barlow Semi Condensed, sans-serif';
    ctx.letterSpacing = '4px';
    for (const r of Object.values(ROOMS)) {
      if (r.bw === undefined) continue;
      const p = ISO.toScreen((r.x1 + r.x2 + 1) / 2, r.y2 - 0.1, 0);
      ctx.fillStyle = ISO.rgba(r.accent, .42);
      ctx.fillText(r.name, p.x, p.y);
    }
    ctx.restore();
  }

  /* ---- uma parede ---- */
  function drawWallTile(ctx, x, y, t, rgbOn, zoom) {
    // afastado, o vidro da divisória some em menos de um pixel
    const detalhe = (zoom === undefined || zoom > 0.7);
    const occ  = wallOccludes(x, y);
    const room = ROOMS[roomOf[idx(x, y)]] || ROOMS.corredor;
    const h    = occ ? PARAPET : WALL_H;

    const showLeft  = !isWall(x, y + 1);   // face virada para +y
    const showRight = !isWall(x + 1, y);   // face virada para +x
    if (!showLeft && !showRight) {
      ISO.plane(ctx, x, y, 1, 1, h, occ ? ISO.shade(C.wallTop, -.08) : C.wallTop);
      return;
    }

    const P = ISO.toScreen;
    const faces = [];
    if (showLeft)  faces.push({ o: 'n', pts: [P(x, y+1, h), P(x+1, y+1, h), P(x+1, y+1, 0), P(x, y+1, 0)] });
    if (showRight) faces.push({ o: 'w', pts: [P(x+1, y, h), P(x+1, y+1, h), P(x+1, y+1, 0), P(x+1, y, 0)] });

    for (const f of faces) {
      if (detalhe) {
        const tex = texturaConcreto(f.o);
        wallFace(ctx, f.o, x, y, 1, h, c => c.drawImage(tex, 0, WALL_H - h, ISO.TW, h, 0, 0, ISO.TW, h));
      } else {
        // afastado, a textura não aparece: só a cor do concreto
        ISO.quad(ctx, f.pts, ISO.shade(C.wall, f.o === 'n' ? -0.12 : -0.38));
      }
      // sombra de rodapé, onde o concreto encontra o piso
      ISO.quad(ctx, [f.pts[3], f.pts[2],
                     { x: f.pts[2].x, y: f.pts[2].y - 4 }, { x: f.pts[3].x, y: f.pts[3].y - 4 }],
               'rgba(0,0,0,.22)');
      if (occ) {
        // fita de LED âmbar correndo no pé da mureta
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ISO.quad(ctx, [{ x: f.pts[3].x, y: f.pts[3].y - 5 }, { x: f.pts[2].x, y: f.pts[2].y - 5 },
                       { x: f.pts[2].x, y: f.pts[2].y - 7 }, { x: f.pts[3].x, y: f.pts[3].y - 7 }],
                 ISO.rgba(C.luz, .5));
        ctx.restore();
      } else if (detalhe && temJanela(x, y, f.o)) {
        const tex = texturaJanela(f.o, (x * 3 + y * 5) % 4);
        wallFace(ctx, f.o, x, y, 1, WALL_H, c => c.drawImage(tex, 0, 0));
      }
    }

    // topo da parede / da mureta
    ISO.plane(ctx, x, y, 1, 1, h, occ ? ISO.shade(C.wallTop, -.08) : C.wallTop);

    if (!occ) {
      // sanca de luz quente correndo no alto do concreto
      ctx.strokeStyle = 'rgba(255,240,215,.28)'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const f of faces) { ctx.moveTo(f.pts[0].x, f.pts[0].y); ctx.lineTo(f.pts[1].x, f.pts[1].y); }
      ctx.stroke();
    } else {
      // painel de vidro fino no eixo da mureta, com a linha de luz da sala no topo
      const corre = (dx, dy) => { const k = kindAt(x + dx, y + dy); return k === WALL || k === DOOR; };
      let horiz = corre(-1, 0) || corre(1, 0), vert = corre(0, -1) || corre(0, 1);
      if (!horiz && !vert) horiz = vert = true;
      const vidros = [];
      if (horiz) vidros.push([P(x, y + .5, WALL_H), P(x + 1, y + .5, WALL_H), P(x + 1, y + .5, h), P(x, y + .5, h)]);
      if (vert)  vidros.push([P(x + .5, y, WALL_H), P(x + .5, y + 1, WALL_H), P(x + .5, y + 1, h), P(x + .5, y, h)]);
      const pulso = rgbOn ? .55 + .25 * Math.sin(t * 1.6 + (x + y) * .18) : .55;
      for (const v of vidros) {
        if (detalhe) ISO.quad(ctx, v, 'rgba(200,222,236,.09)');
        ctx.strokeStyle = 'rgba(18,19,20,.8)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(v[0].x, v[0].y); ctx.lineTo(v[1].x, v[1].y); ctx.stroke();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = ISO.rgba(C.luz, pulso); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(v[0].x, v[0].y - 1); ctx.lineTo(v[1].x, v[1].y - 1); ctx.stroke();
        ctx.restore();
      }
    }

    drawSignTile(ctx, x, y, t, rgbOn);
  }

  /**
   * Fatia da placa que pertence a este tile de parede.
   * Recortando por tile, cada pedaço é pintado junto com a sua parede e a
   * placa nunca parece enfiada dentro do concreto.
   */
  function drawSignTile(ctx, x, y, t, rgbOn) {
    for (const s of SIGNS) {
      const cobre = s.o === 'n'
        ? (s.y === y && x >= s.x && x < s.x + s.len)
        : (s.x === x && y >= s.y && y < s.y + s.len);
      if (!cobre) continue;
      const T = ISO.TW;
      const off = s.o === 'n' ? (x - s.x) * T
                              : (s.y + s.len - 1 - y) * T;
      const cv = placaCanvas(s, t, rgbOn);
      wallFace(ctx, s.o, x, y, 1, WALL_H, (c) =>
        c.drawImage(cv, off, 0, T, WALL_H, 0, 0, T, WALL_H));
    }
  }

  /* ---- porta: batente de concreto com a luz da sala ---- */
  function drawDoorTile(ctx, x, y, t) {
    const d = DOORS.find(d => d.x === x && d.y === y);
    if (!d) return;
    const room = ROOMS[portaDe(d)] || ROOMS.corredor;
    const P = ISO.toScreen;
    const h = 96;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (d.o === 'h') {
      ISO.quad(ctx, [P(x, y+1, h), P(x+1, y+1, h), P(x+1, y+1, h-3), P(x, y+1, h-3)], ISO.rgba(C.luz, .75));
    } else {
      ISO.quad(ctx, [P(x+1, y, h), P(x+1, y+1, h), P(x+1, y+1, h-3), P(x+1, y, h-3)], ISO.rgba(C.luz, .75));
    }
    const c = ISO.toScreen(x + .5, y + .5, 20);
    ISO.glow(ctx, c.x, c.y, 56, C.luz, .14 + .03 * Math.sin(t * 2));
    void room;
    ctx.restore();
  }
  /** a sala que uma porta atende (a do lado que não é corredor) */
  function portaDe(d) {
    const viz = d.o === 'h' ? [roomAt(d.x, d.y - 1), roomAt(d.x, d.y + 1)]
                            : [roomAt(d.x - 1, d.y), roomAt(d.x + 1, d.y)];
    return viz.find(r => r && r !== 'corredor') || 'corredor';
  }

  /** profundidade do painel, para ele entrar na ordenação junto com
      móveis e bonecos — senão ele seria pintado por cima de todo mundo */
  function signDepth(s) {
    return s.o === 'n' ? (s.x + s.len / 2) + (s.y + 1)
                       : (s.x + 1) + (s.y + s.len / 2);
  }

  /* ---- conteúdo de uma placa, em espaço plano de parede ---- */
  function pintaPlaca(c, s, len, t, rgbOn) {
    if (s.kind === 'nome') {
      const padY = 16, hgt = 62;
      c.fillStyle = 'rgba(12,12,13,.7)';
      c.fillRect(6, padY, len - 12, hgt);
      signNome(c, len, padY, hgt, rgbOn);
    }
    else if (s.kind === 'logo')       signLogo(c, len, rgbOn, false);
    else if (s.kind === 'logoMini')   signLogo(c, len, rgbOn, true);
    else if (s.kind === 'equipe')     signEquipe(c, len, t, rgbOn);
    else if (s.kind === 'eventos')    signEventos(c, len, rgbOn);
    else if (s.kind === 'quadro')     signQuadro(c, len);
    else if (s.kind === 'cinema')     signCinema(c, len, t);
    else if (s.kind === 'ia')         signIA(c, len, t);
    else if (s.kind === 'financeiro') signFinanceiro(c, len, t);
    else if (s.kind === 'inovacao')   signInovacao(c, len);
  }

  /* Cada placa é pintada num canvas próprio e depois só é COPIADA para
     cada tile de parede.                                                */
  const cachePlaca = new Map();
  function placaCanvas(s, t, rgbOn) {
    let c = cachePlaca.get(s);
    if (!c) {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(s.len * ISO.TW); cv.height = WALL_H;
      c = { cv, ctx: cv.getContext('2d'), t: -1e9, rgb: null };
      cachePlaca.set(s, c);
    }
    // a tela de cinema anda mais rápido; o resto repinta ~6x por segundo
    const passo = s.kind === 'cinema' || s.kind === 'ia' ? 0.06 : 0.16;
    if (t - c.t > passo || c.t > t || c.rgb !== rgbOn) {
      c.t = t; c.rgb = rgbOn;
      c.ctx.clearRect(0, 0, c.cv.width, c.cv.height);
      pintaPlaca(c.ctx, s, c.cv.width, t, rgbOn);
    }
    return c.cv;
  }

  /* ---- logos e painéis nas paredes altas ---- */
  function drawSigns(ctx, t, rgbOn, lista) {
    for (const s of (lista || SIGNS)) {
      const cv = placaCanvas(s, t, rgbOn);
      wallFace(ctx, s.o, s.x, s.y, s.len, WALL_H, (c) => c.drawImage(cv, 0, 0));
    }
  }

  /* ---- a marca: img/logo-claro.png (versão para fundo escuro), ou o arquivo
     apontado em "logo" no config; img/marca.png é só o símbolo da ovelha ---- */
  const carrega = (src) => { const im = new Image(); im.ok = false; im.onload = () => { im.ok = true; }; im.src = src; return im; };
  const logoGrande = carrega(E.logo || 'img/logo-claro.png');
  const logoMini   = carrega('img/marca.png');

  function signLogo(c, len, rgbOn, mini) {
    // placa de aço escuro parafusada no concreto
    const x0 = mini ? 6 : 14, y0 = mini ? 22 : 14, w = len - x0 * 2, h = mini ? 60 : 80;
    c.fillStyle = 'rgba(14,14,15,.92)';
    c.fillRect(x0, y0, w, h);
    c.fillStyle = 'rgba(255,255,255,.18)';
    for (const [px, py] of [[x0 + 5, y0 + 5], [x0 + w - 5, y0 + 5], [x0 + 5, y0 + h - 5], [x0 + w - 5, y0 + h - 5]]) {
      c.beginPath(); c.arc(px, py, 1.4, 0, 7); c.fill();
    }
    const logoImg = mini ? logoMini : logoGrande;
    if (logoImg.ok) {
      const pad = mini ? 8 : 12;
      const bw = w - pad * 2, bh = h - pad * 2;
      const k = Math.min(bw / logoImg.width, bh / logoImg.height);
      const lw = logoImg.width * k, lh = logoImg.height * k;
      if (rgbOn) { c.shadowColor = ISO.rgba(C.marca, .45); c.shadowBlur = 10; }
      c.drawImage(logoImg, x0 + (w - lw) / 2, y0 + (h - lh) / 2, lw, lh);
      c.shadowBlur = 0;
    } else {
      signNome(c, len, y0, h, rgbOn);
    }
    // filete da cor da marca embaixo da placa
    c.fillStyle = ISO.rgba(C.marca, .9);
    c.fillRect(x0, y0 + h + 3, w, 2);
  }

  /* ---- painel da equipe: quem está trabalhando agora ---- */
  function signEquipe(c, len, t, rgbOn) {
    const x0 = 8, y0 = 12, w = len - 16, h = 84;
    c.fillStyle = 'rgba(12,13,14,.92)';
    c.fillRect(x0, y0, w, h);
    c.strokeStyle = ISO.rgba(ROOMS.ia.accent, .35); c.lineWidth = 1.2; c.strokeRect(x0, y0, w, h);

    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.font = "700 11px 'Barlow Semi Condensed', sans-serif";
    c.fillStyle = ROOMS.ia.accent; c.letterSpacing = '2px';
    c.fillText('EQUIPE AGORA', x0 + 12, y0 + 12);
    c.letterSpacing = '0px';
    c.strokeStyle = 'rgba(255,255,255,.09)';
    c.beginPath(); c.moveTo(x0 + 10, y0 + 22); c.lineTo(x0 + w - 10, y0 + 22); c.stroke();

    const RO = (typeof ROSTER !== 'undefined') ? ROSTER : null;
    const SI = (typeof SISTEMAS !== 'undefined') ? SISTEMAS : null;
    const n = st => RO ? RO.count(st) : 0;
    const noAr = SI ? SI.todos().filter(s => s.estado === 'no ar' || s.estado === 'web').length : 0;
    const cels = [
      { r: 'TRABALHANDO', v: String(n('trabalhando') + n('reuniao')), cor: '#23e08a' },
      { r: 'DESCANSO',    v: String(n('descanso')),                   cor: '#fbbf24' },
      { r: 'OFFLINE',     v: String(n('offline')),                    cor: '#8b8f96' },
      { r: 'SISTEMAS',    v: String(noAr),                            cor: ROOMS.ia.accent }
    ];
    const cw = (w - 20) / cels.length;
    cels.forEach((cel, i) => {
      const cx = x0 + 10 + i * cw;
      if (i) {
        c.strokeStyle = 'rgba(255,255,255,.07)';
        c.beginPath(); c.moveTo(cx - 2, y0 + 28); c.lineTo(cx - 2, y0 + h - 8); c.stroke();
      }
      c.textAlign = 'left';
      c.font = "600 8.5px 'Barlow Semi Condensed', sans-serif";
      c.fillStyle = 'rgba(200,200,200,.7)';
      c.fillText(cel.r, cx + 8, y0 + 36);
      c.font = "700 20px 'Barlow', sans-serif";
      c.fillStyle = cel.cor;
      if (rgbOn) { c.shadowColor = ISO.rgba(cel.cor, .8); c.shadowBlur = 10; }
      c.fillText(cel.v, cx + 8, y0 + 56);
      c.shadowBlur = 0;
      const amp = rgbOn ? (.45 + .55 * Math.abs(Math.sin(t * 1.1 + i))) : .7;
      c.fillStyle = ISO.rgba(cel.cor, .5);
      c.fillRect(cx + 8, y0 + 66, (cw - 24) * amp, 2.5);
    });
  }

  /* ---- agenda de eventos da diretoria ---- */
  function signEventos(c, len, rgbOn) {
    const evs = (typeof QUADRO !== 'undefined') ? QUADRO.eventos() : [];
    const x0 = 8, y0 = 12, w = len - 16, h = 84;

    c.fillStyle = 'rgba(12,13,14,.92)';
    c.fillRect(x0, y0, w, h);
    c.strokeStyle = ISO.rgba(C.marca, .4); c.lineWidth = 1.2; c.strokeRect(x0, y0, w, h);

    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.font = "700 11px 'Barlow Semi Condensed', sans-serif";
    c.fillStyle = C.marca; c.letterSpacing = '2px';
    if (rgbOn) { c.shadowColor = ISO.rgba(C.marca, .6); c.shadowBlur = 8; }
    c.fillText('AGENDA DE PRODUÇÃO', x0 + 12, y0 + 13);
    c.shadowBlur = 0; c.letterSpacing = '0px';
    c.strokeStyle = 'rgba(255,255,255,.09)';
    c.beginPath(); c.moveTo(x0 + 10, y0 + 23); c.lineTo(x0 + w - 10, y0 + 23); c.stroke();

    if (!evs.length) {
      c.font = "600 10px 'Barlow Semi Condensed', sans-serif";
      c.fillStyle = 'rgba(170,170,170,.6)';
      c.fillText('nenhuma filmagem marcada', x0 + 14, y0 + 42);
      return;
    }
    evs.slice(0, 4).forEach((e, i) => {
      const ry = y0 + 36 + i * 15;
      c.font = "700 10px 'Barlow', sans-serif";
      c.fillStyle = C.marca;
      c.fillText(e.data, x0 + 14, ry);
      c.font = "600 10px 'Barlow Semi Condensed', sans-serif";
      c.fillStyle = '#ecebe8';
      c.fillText(e.nome, x0 + 58, ry);
      c.textAlign = 'right';
      c.font = "600 8.5px 'Barlow Semi Condensed', sans-serif";
      c.fillStyle = 'rgba(200,200,200,.7)';
      c.fillText(e.tipo, x0 + w - 14, ry);
      c.textAlign = 'left';
    });
  }

  /* ---- quadro branco de ideias ---- */
  function signQuadro(c, len) {
    const ideias = (typeof QUADRO !== 'undefined') ? QUADRO.ideias() : [];
    const x0 = 10, y0 = 10, w = len - 20, h = 88;

    c.fillStyle = '#2a2b2c';
    c.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#f4f3f0'); g.addColorStop(1, '#dddcd7');
    c.fillStyle = g;
    c.fillRect(x0, y0, w, h);
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath();
    c.moveTo(x0 + w * .55, y0); c.lineTo(x0 + w, y0);
    c.lineTo(x0 + w, y0 + h * .5); c.closePath(); c.fill();

    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.font = "700 11px 'Barlow Semi Condensed', sans-serif";
    c.fillStyle = C.marca; c.letterSpacing = '1.5px';
    c.fillText('IDEIAS', x0 + 12, y0 + 14);
    c.letterSpacing = '0px';
    c.font = "600 8px 'Barlow Semi Condensed', sans-serif";
    c.fillStyle = 'rgba(70,70,70,.7)';
    c.fillText('botão 📌 Quadro', x0 + 58, y0 + 14);
    c.strokeStyle = ISO.rgba(C.marca, .5); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x0 + 12, y0 + 22); c.lineTo(x0 + w - 14, y0 + 22); c.stroke();

    const cores = ['#1f1f1f', '#1f5fd0', '#d8342a', '#1f8a4c', '#7b3fc4'];
    ideias.slice(0, 5).forEach((txt, i) => {
      const ry = y0 + 36 + i * 12.5;
      c.fillStyle = cores[i % cores.length];
      c.beginPath(); c.arc(x0 + 17, ry - 1, 2, 0, 7); c.fill();
      c.font = "600 10.5px 'Barlow Semi Condensed', sans-serif";
      c.fillText(txt, x0 + 25, ry);
    });
    if (!ideias.length) {
      c.font = "italic 600 10px 'Barlow Semi Condensed', sans-serif";
      c.fillStyle = 'rgba(70,70,70,.55)';
      c.fillText('quadro vazio', x0 + 25, y0 + 38);
    }
  }

  /* ---- a tela de cinema: um showreel em loop ----
     Céu que muda de cor, horizonte, uma ovelha atravessando a cena e a
     legenda com timecode. Tudo vetorial, sem arquivo de vídeo.       */
  function corFilme(t) {
    const cena = ((Math.floor(t / 7) % 4) + 4) % 4;
    return ['#ff8a4c', '#4cc9f0', '#c77dff', '#f9c74f'][cena];
  }
  function signCinema(c, len, t) {
    const x0 = 4, y0 = 6, w = len - 8, h = 96;
    // moldura preta da tela
    c.fillStyle = '#060606'; c.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
    const cena = ((Math.floor(t / 7) % 4) + 4) % 4, tc = ((t % 7) + 7) % 7;
    const ceus = [
      ['#2b1640', '#ff8a4c'], ['#06243a', '#4cc9f0'], ['#160a2c', '#c77dff'], ['#3a2306', '#f9c74f']
    ][cena];
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, ceus[0]); g.addColorStop(1, ceus[1]);
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    // sol / lua
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.arc(x0 + w * (.25 + cena * .15), y0 + h * .42, 11, 0, 7); c.fill();
    // montanhas em camadas
    for (let k = 0; k < 2; k++) {
      c.fillStyle = k ? 'rgba(10,10,14,.92)' : 'rgba(20,20,30,.55)';
      c.beginPath(); c.moveTo(x0, y0 + h);
      for (let u = 0; u <= w; u += 16) {
        const v = Math.sin((u + k * 90 + cena * 40) * .018) * 9 + Math.sin(u * .05 + k) * 4;
        c.lineTo(x0 + u, y0 + h * (k ? .8 : .66) + v);
      }
      c.lineTo(x0 + w, y0 + h); c.closePath(); c.fill();
    }
    // a ovelha atravessando
    const ox = x0 + ((t * 38) % (w + 60)) - 30, oy = y0 + h * .8 - 9;
    const pulo = Math.abs(Math.sin(t * 6)) * 2;
    c.fillStyle = '#f2f2f2';
    for (const [dx, dy, r] of [[0, 0, 7], [7, -2, 6], [-6, -1, 6], [3, -6, 6], [-3, -5, 5]]) {
      c.beginPath(); c.arc(ox + dx, oy + dy - pulo, r, 0, 7); c.fill();
    }
    c.fillStyle = '#111';
    c.beginPath(); c.ellipse(ox + 13, oy - 3 - pulo, 4.5, 3.6, .3, 0, 7); c.fill();
    c.fillRect(ox - 5, oy + 4 - pulo, 2, 6); c.fillRect(ox + 5, oy + 4 - pulo, 2, 6);
    // faixas de letterbox
    c.fillStyle = '#000';
    c.fillRect(x0, y0, w, 9); c.fillRect(x0, y0 + h - 9, w, 9);
    // legenda + timecode
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.font = "600 9px 'Barlow Semi Condensed', sans-serif";
    c.fillStyle = 'rgba(255,255,255,.9)';
    const nome = String(E.nome || 'Ovelha Rocks').toUpperCase();
    const legendas = [nome + ' · SHOWREEL', 'LIVE ACTION · ANIMAÇÃO 2D', 'MOTION GRAPHICS', 'VÍDEOS COM INTELIGÊNCIA ARTIFICIAL'];
    if (tc > .6 && tc < 6.4) c.fillText(legendas[cena], x0 + w / 2, y0 + h - 18);
    c.textAlign = 'right';
    c.font = "600 7px 'Barlow', monospace";
    c.fillStyle = 'rgba(255,255,255,.55)';
    const f = Math.floor(t * 24);
    const pad = n => String(n).padStart(2, '0');
    c.fillText(`${pad(Math.floor(f / 86400) % 24)}:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`,
               x0 + w - 6, y0 + 4.5);
    // vinheta
    const vg = c.createRadialGradient(x0 + w / 2, y0 + h / 2, h * .3, x0 + w / 2, y0 + h / 2, w * .6);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
    c.fillStyle = vg; c.fillRect(x0, y0, w, h);
  }

  /* ---- estúdio de IA: prompt sendo digitado e a grade gerada ---- */
  function signIA(c, len, t) {
    const x0 = 8, y0 = 12, w = len - 16, h = 84;
    const acc = ROOMS.ia.accent;
    c.fillStyle = 'rgba(8,12,12,.94)'; c.fillRect(x0, y0, w, h);
    c.strokeStyle = ISO.rgba(acc, .4); c.lineWidth = 1.2; c.strokeRect(x0, y0, w, h);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.font = "700 11px 'Barlow Semi Condensed', sans-serif";
    c.fillStyle = acc; c.letterSpacing = '2px';
    c.fillText('ESTÚDIO DE IA', x0 + 12, y0 + 12);
    c.letterSpacing = '0px';
    const prompts = ['ovelha astronauta, luz de cinema, 35mm', 'plano aéreo de BH ao entardecer, drone',
                     'animação 2D de produto, fundo minimalista', 'concreto brutalista, neblina, câmera lenta'];
    const p = prompts[Math.floor(t / 6) % prompts.length];
    const nch = Math.min(p.length, Math.floor((t % 6) * 14));
    c.font = "600 8.5px 'Barlow Semi Condensed', monospace";
    c.fillStyle = 'rgba(220,240,236,.85)';
    c.fillText('› ' + p.slice(0, nch) + ((t * 2) % 1 > .5 ? '▍' : ''), x0 + 12, y0 + 28);
    // grade de quadros "gerados"
    const cols = 6, gw = (w - 24) / cols, gh = 34;
    for (let i = 0; i < cols; i++) {
      const pronto = (t % 6) * 1.2 > i;
      const gx = x0 + 12 + i * gw, gy = y0 + 40;
      if (pronto) {
        const gg = c.createLinearGradient(gx, gy, gx + gw, gy + gh);
        gg.addColorStop(0, ISO.hsl((i * 47 + Math.floor(t / 6) * 90) % 360, 55, 45));
        gg.addColorStop(1, ISO.hsl((i * 47 + 120 + Math.floor(t / 6) * 90) % 360, 60, 22));
        c.fillStyle = gg;
      } else {
        c.fillStyle = ISO.rgba(acc, .08 + .06 * Math.sin(t * 6 + i));
      }
      c.fillRect(gx + 2, gy, gw - 4, gh);
    }
    c.fillStyle = ISO.rgba(acc, .7);
    c.fillRect(x0 + 12, y0 + h - 8, (w - 24) * ((t % 6) / 6), 2);
  }

  /* ---- financeiro: fluxo de caixa ---- */
  function signFinanceiro(c, len, t) {
    const x0 = 10, y0 = 12, w = len - 20, h = 84;
    const acc = ROOMS.financeiro.accent;
    c.fillStyle = 'rgba(12,13,14,.92)'; c.fillRect(x0, y0, w, h);
    c.strokeStyle = ISO.rgba(acc, .35); c.lineWidth = 1.2; c.strokeRect(x0, y0, w, h);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.font = "700 11px 'Barlow Semi Condensed', sans-serif";
    c.fillStyle = acc; c.letterSpacing = '2px';
    c.fillText('FLUXO DE CAIXA', x0 + 12, y0 + 12);
    c.letterSpacing = '0px';
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const bw = (w - 30) / meses.length;
    meses.forEach((m, i) => {
      const ent = 18 + 22 * Math.abs(Math.sin(i * 1.3 + 2));
      const sai = 10 + 14 * Math.abs(Math.sin(i * .9 + 1));
      const bx = x0 + 15 + i * bw, base = y0 + h - 16;
      c.fillStyle = ISO.rgba('#23e08a', .75); c.fillRect(bx, base - ent, bw * .38, ent);
      c.fillStyle = ISO.rgba('#ef6a5a', .7);  c.fillRect(bx + bw * .42, base - sai, bw * .38, sai);
      c.font = "600 6.5px 'Barlow Semi Condensed', sans-serif";
      c.fillStyle = 'rgba(200,200,200,.55)';
      c.fillText(m, bx, base + 7);
    });
    const mes = new Date().getMonth();
    c.fillStyle = ISO.rgba(acc, .2 + .1 * Math.sin(t * 2));
    c.fillRect(x0 + 13 + mes * bw, y0 + 24, bw - 2, h - 34);
  }

  /* ---- inovação: o quadro do laboratório ---- */
  function signInovacao(c, len) {
    const x0 = 10, y0 = 10, w = len - 20, h = 88;
    const acc = ROOMS.inovacao.accent;
    c.fillStyle = '#1b1c1d'; c.fillRect(x0, y0, w, h);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.font = "700 11px 'Barlow Semi Condensed', sans-serif";
    c.fillStyle = acc; c.letterSpacing = '2px';
    c.fillText('LAB · EM TESTE', x0 + 12, y0 + 13);
    c.letterSpacing = '0px';
    const cols = ['IDEIA', 'PROTÓTIPO', 'NO AR'];
    const cw = (w - 24) / 3;
    const notas = [['#fde68a', '#fbcfe8', '#bae6fd'], ['#bbf7d0', '#fde68a'], ['#fbcfe8']];
    cols.forEach((nome, i) => {
      const cx = x0 + 12 + i * cw;
      c.font = "600 7.5px 'Barlow Semi Condensed', sans-serif";
      c.fillStyle = 'rgba(220,220,220,.6)';
      c.fillText(nome, cx, y0 + 28);
      notas[i].forEach((cor, j) => {
        c.fillStyle = cor;
        c.fillRect(cx + (j % 2) * 22, y0 + 36 + Math.floor(j / 2) * 24 + (j % 2) * 4, 18, 18);
      });
    });
  }

  /* ---- placa com o nome do escritório (data/config.json) ---- */
  function signNome(c, len, y0, h, rgbOn) {
    const nome = String(E.nome || 'Ovelha Rocks').toUpperCase();
    const cx = len / 2, cy = y0 + h / 2;
    c.save();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let tam = 26;
    c.font = `700 ${tam}px 'Barlow', sans-serif`;
    while (tam > 10 && c.measureText(nome).width > len - 36) { tam--; c.font = `700 ${tam}px 'Barlow', sans-serif`; }
    c.fillStyle = '#ffffff';
    c.letterSpacing = '3px';
    if (rgbOn) { c.shadowColor = ISO.rgba(C.marca, .6); c.shadowBlur = 10; }
    c.fillText(nome, cx, cy - 6);
    c.shadowBlur = 0;
    if (E.subtitulo) {
      c.font = `500 ${Math.min(10, len / 22)}px 'Barlow Semi Condensed', sans-serif`;
      c.fillStyle = 'rgba(220,220,220,.6)'; c.letterSpacing = '2px';
      c.fillText(String(E.subtitulo).toUpperCase().slice(0, 48), cx, cy + 16);
    }
    c.restore();
  }

  /* ---- decalques no chão ---- */
  function drawDecals(ctx, t) { /* piso de concreto liso */ }

  /* ---------- pontos de interesse ---------- */
  const SPAWN = { x: 62, y: 15 };          // elevador / recepção

  return {
    W, H, VOID, FLOOR, WALL, DOOR, C,
    ROOMS, ORDEM, DOORS, SPAWN, WALL_H, PARAPET,
    SIGNS, signDepth,
    kindAt, roomAt, isWall, walkable, setBlocked, wallOccludes,
    drawFloor, drawWallTile, drawDoorTile, drawSigns, drawDecals, drawRoomLabels,
    wallFace
  };
})();
