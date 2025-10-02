// app.js — versão completa com correção de rationale desalinhado

(() => {
  // ==========================
  // Estado global
  // ==========================
  const state = {
    lang: localStorage.getItem('lang') || 'pt', // 'pt' | 'en'
    questionsMap: new Map(), // id -> question object
    availableIds: new Set(), // ids existentes no JSON
    answered: new Set(),     // ids já respondidos/clicados (para trap sumir)
    currentId: null
  };

  // ==========================
  // Utilidades DOM
  // ==========================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Containers / elementos esperados no HTML
  const el = {
    menuContainer: $('#menuContainer') || $('#menu'),        // grid do menu
    questionContainer: $('#questionContainer') || $('#question'),
    questionTitle: $('#questionTitle'),
    optionsList: $('#optionsList'),
    feedbackContainer: $('#feedbackContainer'),
    feedbackTitle: $('#feedbackTitle'),
    feedbackRationale: $('#feedbackRationale'),
    backToMenuBtn: $('#backToMenuBtn'),
    questionNumberBadge: $('#questionNumberBadge'),

    // seletores de idioma (menu e pergunta)
    languageSelectMenu: $('#languageSelectMenu'),
    languageSelectQuestion: $('#languageSelectQuestion'),

    // wrapper para o bloco/“card” da pergunta (para centralizar trap)
    trapWrapper: $('#trapWrapper') || $('#questionCard'),

    // Grid (botões 1..450)
    questionGrid: $('#questionGrid'),

    // Mensagens/áreas opcionais
    loadingMsg: $('#loadingMsg'),
    errorMsg: $('#errorMsg')
  };

  // ==========================
  // Traduções fixas de UI
  // ==========================
  const i18n = {
    headingRationaleWrong: { pt: 'Incorreto. Revise a justificativa:', en: 'Incorrect. Review the rationale:' },
    headingRationaleRight:  { pt: 'Correto!',                      en: 'Correct!' },
    trapDefault: {
      pt: 'VOCÊ CAIU NA ARMADILHA! ESSA QUESTÃO É UMA TRAP!',
      en: 'YOU FELL INTO THE TRAP! THIS QUESTION IS A TRAP!'
    }
  };

  // ==========================
  // Carrega questions.json
  // ==========================
  async function loadQuestions() {
    try {
      show(el.loadingMsg, true);
      const res = await fetch('questions.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // Suportar tanto array raiz quanto objeto {questions:[...]}
      const list = Array.isArray(data) ? data : (Array.isArray(data.questions) ? data.questions : []);
      state.questionsMap.clear();
      state.availableIds.clear();

      for (const q of list) {
        if (q && Number.isInteger(q.id)) {
          state.questionsMap.set(q.id, q);
          state.availableIds.add(q.id);
        }
      }
      buildMenu();
      switchToView('menu');
    } catch (e) {
      console.error(e);
      if (el.errorMsg) {
        el.errorMsg.textContent = 'Erro ao carregar as perguntas. Verifique o questions.json.';
        show(el.errorMsg, true);
      }
    } finally {
      show(el.loadingMsg, false);
    }
  }

  // ==========================
  // Monta menu 1..450
  // ==========================
  function buildMenu() {
    const grid = el.questionGrid || el.menuContainer;
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 1; i <= 450; i++) {
      const btn = document.createElement('button');
      btn.className = 'qbtn';
      btn.textContent = i.toString();
      btn.dataset.id = String(i);

      // roxo/lilás (padrão) — classes CSS no seu arquivo de estilos
      btn.classList.add('btn', 'btn-purple');

      if (!state.availableIds.has(i) || state.answered.has(i)) {
        btn.disabled = true;
        btn.classList.add('btn-disabled');
      }

      btn.addEventListener('click', () => {
        showQuestion(i);
      });

      grid.appendChild(btn);
    }
  }

  // Re-renderiza o estado de habilitado do botão no menu (ex.: trap some após clique)
  function refreshMenuButton(id) {
    const grid = el.questionGrid || el.menuContainer;
    if (!grid) return;
    const btn = grid.querySelector(`button[data-id="${id}"]`);
    if (btn) btn.disabled = true;
  }

  // ==========================
  // Alternância de telas
  // ==========================
  function switchToView(view) {
    // view = 'menu' | 'question'
    if (view === 'menu') {
      show(el.menuContainer, true);
      show(el.questionContainer, false);
    } else {
      show(el.menuContainer, false);
      show(el.questionContainer, true);
    }
  }

  function show(node, visible) {
    if (!node) return;
    node.classList.toggle('hidden', !visible);
  }

  // ==========================
  // Renderização da pergunta
  // ==========================
  function showQuestion(id) {
    const q = state.questionsMap.get(id);
    state.currentId = id;

    if (!q) {
      alert('Pergunta não encontrada: ' + id);
      return;
    }

    switchToView('question');
    syncLanguageSelectors();

    // Número da pergunta
    if (el.questionNumberBadge) {
      el.questionNumberBadge.textContent = `#${id}`;
    }

    // Botão voltar ao menu SEM marcar como respondida
    if (el.backToMenuBtn) {
      el.backToMenuBtn.disabled = false; // sempre habilitado
      el.backToMenuBtn.onclick = () => {
        switchToView('menu');
      };
    }

    // Esconde feedback anterior
    if (el.feedbackContainer) show(el.feedbackContainer, false);

    // TRAP?
    if (q.trap) {
      renderTrap(q);
      // trap deve sumir do menu após clicada
      state.answered.add(id);
      refreshMenuButton(id);
      return;
    }

    // Pergunta normal
    renderQuestion(q);
  }

  function renderTrap(q) {
    if (el.questionTitle) {
      el.questionTitle.textContent = ''; // sem título de pergunta “normal”
    }
    if (el.optionsList) el.optionsList.innerHTML = '';

    // Mensagem da trap
    const msg = (q.trapMessage && q.trapMessage[state.lang]) || i18n.trapDefault[state.lang];

    // Área “card” para centralizar
    const wrapper = el.trapWrapper || el.questionContainer;
    if (wrapper) {
      wrapper.classList.add('trap-mode'); // CSS: centralizar/coloração
    }

    const trapBlock = document.createElement('div');
    trapBlock.className = 'trap-block';

    const p = document.createElement('p');
    p.className = 'trap-text';
    p.textContent = msg;

    trapBlock.appendChild(p);

    // Imagem (opcional)
    if (q.image) {
      const img = document.createElement('img');
      img.src = q.image;
      img.alt = 'trap';
      img.className = 'trap-image';
      trapBlock.appendChild(img);
    }

    if (el.optionsList) {
      el.optionsList.appendChild(trapBlock);
    }
  }

  function renderQuestion(q) {
    // Título
    const title = (q.q && q.q[state.lang]) || '';
    if (el.questionTitle) el.questionTitle.textContent = title;

    // Opções
    const opts = (q.options && q.options[state.lang]) || [];
    if (el.optionsList) {
      el.optionsList.innerHTML = '';
      opts.forEach((optText, idx) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'option btn btn-outline';
        btn.textContent = optText;
        btn.addEventListener('click', () => {
          checkAnswer(q, idx);
        });
        li.appendChild(btn);
        el.optionsList.appendChild(li);
      });
    }

    // Remove classe de trap do card, caso venha de uma trap anterior
    const wrapper = el.trapWrapper || el.questionContainer;
    if (wrapper) wrapper.classList.remove('trap-mode');
  }

  // ==========================
  // Heurística para rationale desalinhado
  // ==========================
  function pickRationale(rats, opts, selectedIdx, correctIdx) {
    // 1) índice direto (ideal quando JSON está alinhado)
    if (Array.isArray(rats) && rats[selectedIdx]) return rats[selectedIdx];

    // 2) tentar casar pelo texto da opção selecionada (normalize sem acentos)
    const norm = (s) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();

    const sel = norm(opts[selectedIdx] || '');
    if (Array.isArray(rats) && sel) {
      // tenta bater por inclusão de 2 primeiras palavras da opção
      const pivot = sel.split(/\s+/).slice(0, 2).join(' ');
      for (const r of rats) {
        if (typeof r === 'string') {
          const rr = norm(r);
          if ((pivot && rr.includes(pivot)) || rr.includes(sel)) {
            return r;
          }
        }
      }
    }

    // 3) fallback para a justificativa do item correto (garante algo útil)
    return (Array.isArray(rats) && rats[correctIdx]) ? rats[correctIdx] : '';
  }

  // ==========================
  // Checar resposta
  // ==========================
  function checkAnswer(q, selectedIdx) {
    const lang = state.lang;
    const opts = (q.options && q.options[lang]) || [];
    const rats = (q.rationales && q.rationales[lang]) || [];
    const correctIdx = Number.isInteger(q.correctIndex) ? q.correctIndex : 0;

    const isCorrect = selectedIdx === correctIdx;

    // Título do feedback
    if (el.feedbackTitle) {
      el.feedbackTitle.textContent = isCorrect
        ? i18n.headingRationaleRight[lang]
        : i18n.headingRationaleWrong[lang];
    }

    // Escolha da justificativa
    let rationale = '';
    if (Array.isArray(rats) && rats.length) {
      if (isCorrect) {
        rationale = rats[correctIdx] ?? '';
      } else {
        rationale = pickRationale(rats, opts, selectedIdx, correctIdx);
      }
    }
    if (el.feedbackRationale) el.feedbackRationale.textContent = rationale;

    if (el.feedbackContainer) show(el.feedbackContainer, true);

    // Marca como respondida (para sumir do menu só quando for trap já tratamos ao abrir)
    state.answered.add(q.id);
  }

  // ==========================
  // Idioma
  // ==========================
  function setLanguage(lang) {
    state.lang = lang === 'en' ? 'en' : 'pt';
    localStorage.setItem('lang', state.lang);

    // se estiver numa pergunta, re-renderiza a atual
    if (state.currentId != null) {
      const q = state.questionsMap.get(state.currentId);
      if (q) {
        if (q.trap) renderTrap(q);
        else renderQuestion(q);
      }
    }
  }

  function syncLanguageSelectors() {
    if (el.languageSelectMenu) el.languageSelectMenu.value = state.lang;
    if (el.languageSelectQuestion) el.languageSelectQuestion.value = state.lang;
  }

  // Listeners dos selects de idioma (se existirem)
  if (el.languageSelectMenu) {
    el.languageSelectMenu.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
  if (el.languageSelectQuestion) {
    el.languageSelectQuestion.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }

  // ==========================
  // Inicialização
  // ==========================
  document.addEventListener('DOMContentLoaded', () => {
    syncLanguageSelectors();
    loadQuestions();
  });

  // ==========================
  // Estilos utilitários aplicados via JS (caso seu CSS não tenha)
  // ==========================
  // Estes nomes de classe são citados no JS acima. Se você já tem no CSS, pode remover.
  const style = document.createElement('style');
  style.textContent = `
    .hidden { display: none !important; }
    .btn { cursor: pointer; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; }
    .btn:disabled { opacity: .35; cursor: not-allowed; }
    .btn-purple { background: #7C3AED; color: #fff; border-color: #7C3AED; }
    .btn-outline { background: #fff; }
    .btn-disabled { background: #f3f4f6; color: #9ca3af; }

    .qbtn { margin: 4px; min-width: 48px; }

    /* Opções da pergunta */
    #optionsList { list-style: none; padding: 0; margin: 0; }
    #optionsList li { margin-bottom: 12px; }
    #optionsList .option { width: 100%; text-align: left; }

    /* Trap visual */
    .trap-mode .trap-block { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; }
    .trap-text { color: #DC2626; font-weight: 700; margin-bottom: 16px; }
    .trap-image { max-width: 380px; width: 100%; height: auto; display: block; }
  `;
  document.head.appendChild(style);
})();
