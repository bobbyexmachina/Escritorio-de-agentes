/* ===========================================================
   roster.js — quem trabalha aqui.
   BOSSES  : você (sempre em serviço, na Diretoria)
   CATALOG : o agente de exemplo + vagas sugeridas para começar
   =========================================================== */
const ROSTER = (() => {

  const KEY = 'escritorio-agentes-v1';

  /* ===========================================================
     O DONO — o nome vem de data/config.json ("dono")
     =========================================================== */
  const BOSSES = [
    {
      id: 'boss-1', name: (window.ESCRITORIO && ESCRITORIO.dono) || 'Bobby', role: 'Sócio administrador · Diretoria',
      emoji: '⭐', boss: true, dept: 'diretoria', slotId: 'DIR-1',
      status: 'trabalhando', locked: true,
      source: 'Diretoria', sistema: null,
      brief: 'Sócio administrador da produtora. Sempre em serviço.',
      look: {
        skin: '#d9a17a', hair: '#2a1d14', style: 'curto',
        shirt: '#334155', pants: '#1e293b', shoes: '#15181f',
        glasses: null, beard: null, tattoo: false, cap: false,
        uniforme: false
      }
    }
  ];

  /* ===========================================================
     BANCO DE TALENTOS
     'detectado' = tem sistema no registro (data/sistemas.json)
     'sugerido'  = vaga de ideia; contrate e depois ligue um sistema a ela
     =========================================================== */
  const CATALOG = [
    {
      key: 'exemplo', name: 'EXEMPLO', role: 'Agente de demonstração', emoji: '🤖',
      cat: 'detectado', system: 'Agente de exemplo', sistema: 'exemplo', dept: 'funcionarios',
      desc: 'Um sistema mínimo que vem junto, na pasta exemplo-agente: sobe na porta 4401 e mostra uma página.',
      why: 'Serve de molde. Clique no computador dele para ver o escritório ligar, embutir e conversar com um sistema. Depois cadastre os seus.',
      look: { skin: '#c9854f', hair: '#140f0c', style: 'cacheado', shirt: '#38bdf8', pants: '#26304a', glasses: null, beard: null }
    },
    {
      key: 'editor', name: 'Theo', role: 'Edição de vídeo', emoji: '🎬', cat: 'sugerido', dept: 'edicao',
      desc: 'Organiza o material bruto, monta o primeiro corte e prepara as versões para cada rede.',
      why: 'Edição é onde o projeto ganha ritmo. Um agente que adianta decupagem e versões libera o editor para o que importa.',
      look: { skin: '#f0c29b', hair: '#241a13', style: 'fade', shirt: '#1f2937', pants: '#111827', glasses: null, beard: 'cavanhaque' }
    },
    {
      key: 'colorista', name: 'Lia', role: 'Correção de cor', emoji: '🎨', cat: 'sugerido', dept: 'cor',
      desc: 'Confere padrões de cor, gera LUTs de referência e checa consistência entre planos.',
      why: 'Cor consistente é o que separa vídeo amador de vídeo institucional. Um checklist automático evita retrabalho.',
      look: { skin: '#7a4a2c', hair: '#140f0c', style: 'coque', shirt: '#6b21a8', pants: '#1b2030', glasses: 'redondo', beard: null }
    },
    {
      key: 'animador', name: 'Gabi', role: 'Animação 2D', emoji: '✏️', cat: 'sugerido', dept: 'animacao',
      desc: 'Prepara storyboards, animatics e lista de cenas para os animadores.',
      why: 'Planejamento de animação bem feito corta semanas de produção.',
      look: { skin: '#e0a878', hair: '#5a3a22', style: 'longo', shirt: '#f59e0b', pants: '#26304a', glasses: null, beard: null }
    },
    {
      key: 'motion', name: 'Caio', role: 'Motion graphics', emoji: '🌀', cat: 'sugerido', dept: 'animacao',
      desc: 'Monta templates de lettering, vinhetas e lower thirds a partir da marca do cliente.',
      why: 'Peças de motion se repetem muito. Template bom é entrega mais rápida em todo projeto.',
      look: { skin: '#f7d7bd', hair: '#8b5a2b', style: 'curto', shirt: '#0ea5e9', pants: '#1b2030', glasses: 'retangular', beard: null }
    },
    {
      key: 'ia', name: 'Nina', role: 'Criação com IA', emoji: '🧠', cat: 'sugerido', dept: 'ia',
      desc: 'Escreve prompts, gera imagens e cenas com IA e organiza as versões aprovadas.',
      why: 'Vídeo com IA é a frente mais nova da produtora. Um agente dedicado mantém o padrão de qualidade entre projetos.',
      look: { skin: '#c9854f', hair: '#1a120d', style: 'cacheado', shirt: '#14b8a6', pants: '#1b2030', glasses: null, beard: null }
    },
    {
      key: 'maya', name: 'Maya Albuquerque', role: 'Diretora de Operações', emoji: '🧭',
      cat: 'detectado', system: 'Operação', sistema: 'maya', dept: 'diretoria',
      desc: 'Transforma objetivos e informações soltas em operação: diagnóstico, prioridades, plano, SOPs, rotinas e revisão.',
      why: 'Prioridade clara, responsável e prazo em cada ação, e a menor estrutura que funcione — sem burocracia.',
      look: { skin: '#f0c29b', hair: '#140f0c', style: 'longo', shirt: '#0f172a', pants: '#111827', glasses: 'retangular', beard: null }
    },
    {
      key: 'roteiro', name: 'Juca', role: 'Roteiro & Criação', emoji: '📝', cat: 'sugerido', dept: 'funcionarios',
      desc: 'Transforma o briefing do cliente em conceito, roteiro e decupagem técnica.',
      why: 'Todo vídeo começa no papel. Roteiro rápido e bem estruturado acelera a aprovação.',
      look: { skin: '#f0c29b', hair: '#140f0c', style: 'curto', shirt: '#e5e7eb', pants: '#1f2937', glasses: 'retangular', beard: 'cheia' }
    },
    {
      key: 'frederico', name: 'Frederico', role: 'Comercial & CRM', emoji: '🤝',
      cat: 'detectado', system: 'CRM Comercial', sistema: 'frederico', dept: 'vendas',
      desc: 'Organiza prospecção, qualificação, follow-up, propostas e o pipeline no formato do CRM padrão.',
      why: 'Nenhuma oportunidade sem próximo passo, data e motivo. Sem spam, sem pressão e sem preço que você não informou.',
      look: { skin: '#e0a878', hair: '#241a13', style: 'fade', shirt: '#1f2937', pants: '#111827', glasses: null, beard: 'cavanhaque' }
    },
    {
      key: 'social', name: 'Duda', role: 'Social Media', emoji: '📱', cat: 'sugerido', dept: 'marketing',
      desc: 'Planeja o calendário da Ovelha Rocks, recorta o showreel para as redes e escreve as legendas.',
      why: 'Produtora que não mostra o próprio trabalho perde cliente. Constância nas redes custa tempo.',
      look: { skin: '#f7d7bd', hair: '#8b5a2b', style: 'longo', shirt: '#f472b6', pants: '#1b2030', glasses: null, beard: null }
    },
    {
      key: 'rosangela', name: 'Rosângela Maria', role: 'Financeiro & Performance', emoji: '📊',
      cat: 'detectado', system: 'Painel Financeiro & Performance', sistema: 'rosangela', dept: 'financeiro',
      desc: 'Organiza caixa, resultado, margem, unit economics, orçamento, alertas e cenários, sempre mostrando fórmula, entradas e interpretação.',
      why: 'Decidir preço, contratação e investimento com o número na mão. Ela nunca inventa valor: o que falta aparece como não informado.',
      look: { skin: '#c9854f', hair: '#3a2416', style: 'longo', shirt: '#7628f1', pants: '#1b2030', glasses: 'retangular', beard: null }
    },
    {
      key: 'inovacao', name: 'Cami', role: 'Pesquisa & Inovação', emoji: '🧪', cat: 'sugerido', dept: 'inovacao',
      desc: 'Testa ferramentas novas de vídeo e IA e traz o que dá para usar já no próximo projeto.',
      why: 'O mercado muda todo mês. Alguém precisa testar antes para o estúdio não ficar para trás.',
      look: { skin: '#f0c29b', hair: '#140f0c', style: 'longo', shirt: '#84cc16', pants: '#1b2030', glasses: 'redondo', beard: null }
    },
    {
      key: 'producao', name: 'Bia', role: 'Produção & Atendimento', emoji: '🎧', cat: 'sugerido', dept: 'funcionarios',
      desc: 'Cuida do cronograma, das diárias de filmagem, da equipe e do contato com o cliente.',
      why: 'Produção organizada é filmagem sem imprevisto e cliente tranquilo.',
      look: { skin: '#7a4a2c', hair: '#140f0c', style: 'coque', shirt: '#64748b', pants: '#1b2030', glasses: null, beard: null }
    }
  ];

  /* ===========================================================
     ESTADO
     =========================================================== */
  let team = [];

  function defaults() {
    const base = BOSSES.map(b => Object.assign({}, b, { look: Object.assign({}, b.look) }));
    // começa só com o agente de exemplo, para mostrar como funciona
    for (const k of ['exemplo']) {
      const c = CATALOG.find(c => c.key === k);
      base.push(fromCatalog(c));
    }
    return base;
  }

  function fromCatalog(c) {
    return {
      id: 'ag-' + c.key,
      key: c.key,
      name: c.name,
      role: c.role,
      emoji: c.emoji,
      system: c.system || null,
      sistema: c.sistema || null,
      path: c.path || null,
      brief: c.desc,
      dept: c.dept || 'funcionarios',
      slotId: null,
      status: 'trabalhando',
      boss: false,
      locked: false,
      look: AVATAR.makeLook(c.key, c.look)
    };
  }

  /* ===========================================================
     PERSISTÊNCIA

     O disco manda. A equipe já morava só no localStorage do navegador
     e um dia voltou inteira ao padrão: nome que você deu, contratação,
     estação, horário — tudo perdido de uma vez, sem aviso. O navegador
     limpa storage quando quer. Agora o arquivo é data/equipe.json, no
     servidor, e o localStorage é só um espelho para quando ele estiver
     fora do ar.
     =========================================================== */
  const doLocal = () => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      return d && Array.isArray(d.team) && d.team.length ? d.team : null;
    } catch (e) { return null; }
  };

  async function load() {
    let vindoDoDisco = null;
    try {
      const d = await (await fetch('/api/equipe')).json();
      if (d && Array.isArray(d.team) && d.team.length) vindoDoDisco = d.team;
    } catch (e) { /* servidor fora: vale o que o navegador tiver */ }

    team = vindoDoDisco || doLocal() || defaults();
    recompor();              // equipe salva antes pode não ter os campos novos
    if (!vindoDoDisco) save();   // primeira vez ou migração: carimba no disco
  }

  /** reencaixa campos que chegaram depois de a equipe já ter sido salva,
      como o id do sistema que o agente opera */
  function recompor() {
    for (const a of team) {
      const c = CATALOG.find(c => c.key === a.key);
      if (c) {
        if (!a.sistema && c.sistema) a.sistema = c.sistema;
        if (c.path && a.path !== c.path) a.path = c.path;
      }
      const b = BOSSES.find(b => b.id === a.id);
      if (b && !a.sistema && b.sistema) a.sistema = b.sistema;
      // sem look o boneco não é desenhado: fica um funcionário invisível na
      // mesa. Reconstrói a partir da key, que é determinística — o mesmo
      // agente volta com a mesma cara de sempre.
      if (!a.look || !a.look.skin) {
        const base = (c && c.look) || (b && b.look) || {};
        a.look = AVATAR.makeLook(a.key || a.id, Object.assign({}, base));
      }
    }
  }

  let gravando = null;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ team, v: 1 })); }
    catch (e) { /* storage bloqueado: o disco ainda pega */ }
    // junta as chamadas seguidas num POST só — arrastar um agente dispara
    // save() várias vezes por segundo
    clearTimeout(gravando);
    gravando = setTimeout(() => {
      fetch('/api/equipe', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, v: 1 })
      }).catch(() => { /* offline: fica o espelho do navegador */ });
    }, 300);
  }

  function reset() { team = defaults(); save(); }

  /* ---------- operações ---------- */
  function hire(key) {
    const c = CATALOG.find(c => c.key === key);
    if (!c || team.some(a => a.key === key)) return null;
    const a = fromCatalog(c);
    team.push(a); save();
    return a;
  }

  function hireCustom(data) {
    const key = 'custom-' + Date.now().toString(36);
    const a = {
      id: 'ag-' + key, key,
      name: data.name || 'Novo agente',
      role: data.role || 'Função a definir',
      emoji: data.emoji || '🤖',
      system: data.system || null, path: data.path || null,
      sistema: data.sistema || null, reuniao: data.reuniao !== false,
      brief: data.brief || '',
      dept: data.dept || 'funcionarios', slotId: null, status: 'trabalhando',
      boss: false, locked: false, custom: true,
      look: AVATAR.makeLook(key, data.look || {})
    };
    team.push(a); save();
    return a;
  }

  function fire(id) {
    const i = team.findIndex(a => a.id === id);
    if (i < 0 || team[i].locked) return false;
    team.splice(i, 1); save();
    return true;
  }

  const get = (id) => team.find(a => a.id === id);
  const all = () => team;
  // quem já tem o sistema da vaga (cadastrado à mão, por exemplo) conta como contratado
  const isHired = (key) => {
    const c = CATALOG.find(c => c.key === key);
    return team.some(a => a.key === key || (c && c.sistema && a.sistema === c.sistema));
  };
  const count = (st) => team.filter(a => a.status === st).length;

  return { BOSSES, CATALOG, load, save, reset, hire, hireCustom, fire,
           get, all, isHired, count, fromCatalog };
})();
