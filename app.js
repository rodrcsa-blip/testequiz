// app.js — com login (usuário obrigatório) + correção de rationale desalinhado + traps + roxo

(() => {
  // ==========================
  // Estado global
  // ==========================
  const state = {
    lang: localStorage.getItem('lang') || 'pt', // 'pt' | 'en'
    user: localStorage.getItem('quiz_user') || '',
    questionsMap: new Map(),
    availableIds: new Set(),
    answered: new Set(),
    currentId: null
  };

  // ==========================
  // DOM helpers
  // ==========================
  const $ = (sel) => document.querySelector(sel);

  const el = {
    // LOGIN
    loginView:        $('#loginView'),
    usernameInput:    $('#usernameInput'),
    passwordInput:    $('#passwordInput'),
    loginBtn:         $('#loginBtn'),
    loginError:       $('#loginError'),

    // MENU & QUESTION
    menuContainer:    $('#menuContainer') || $('#menu'),
    questionContainer:$('#questionContainer') || $('#question'),
    questionTitle:    $('#questionTitle'),
    optionsList:      $('#optionsList'),
    feedbackContainer:$('#feedbackContainer'),
    feedbackTitle:    $('#feedbackTitle'),
    feedbackRationale:$('#feedbackRationale'),
    backToMenuBtn:    $('#backToMenuBtn'),
    questionNumberBadge: $('#questionNumberBadge'),
    languageSelectMenu:    $('#languageSelectMenu'),
    languageSelectQuestion:$('#languageSelectQuestion'),
    trapWrapper:      $('#trapWrapper') || $('#questionCard'),
    questionGrid:     $('#questionGrid'),
    loadingMsg:       $('#loadingMsg'),
    errorMsg:         $('#errorMsg')
  };

  const i18n = {
    headingRationaleWrong: { pt: 'Incorreto. Revise a justificativa:', en: 'Incorrect. Review the rationale:' },
    headingRationaleRight: { pt: 'Correto!', en: 'Correct!' },
    trapDefault: {
      pt: 'VOCÊ CAIU NA ARMADILHA! ESSA QUESTÃO É UMA TRAP!',
      en: 'YOU FELL INTO THE TRAP! THIS QUESTION IS A TRAP!'
    }
  };

  // ==========================
  // Utilidades
  // ==========================
  const show = (node, visible) => { if (node) node.classList.toggle('hidden', !visible); };

  function switchToView(view) {
    // view: 'login' | 'menu' | 'question'
    if (view === 'login') {
      show(el.loginView, true);
      show(el.menuContainer, false);
      show(el.questionContainer, false);
      return;
    }
    if (view === 'menu') {
      show(el.loginView, false);
      show(el.menuContainer, true);
      show(el.questionContainer, false);
      return;
    }
    // question
    show(el.loginView, false);
    show(el.menuContainer, false);
    show(el.questionContainer, true);
  }

  // ==========================
  // LOGIN
  // ==========================
  function setupLogin() {
    if (!el.loginBtn || !el.usernameInput) return;

    el.loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const user = (el.usernameInput.value || '').trim();
      // senha pode ser qualquer coisa; só não mostra mensagem dizendo isso
      if (!user) {
        if (el.loginError) {
          el.loginError.textContent = 'Informe seu nome para entrar.';
          show(el.loginError, true);
        }
        el.usernameInput.focus();
        return;
      }
      // ok
      state.user = user;
      localStorage.setItem('quiz_user', user);
      if (el.loginError) show(el.loginError, false);
      // carrega perguntas após “logar”
      initAfterLogin();
    });
  }

  function initAfterLogin() {
    // sincroniza idioma e carrega JSON
    syncLanguageSelectors();
    loadQuestions();
  }

  // ==========================
  // Carregar perguntas
  // ==========================
  async function loadQuestions() {
    try {
      show(el.loadingMsg, true);
      const res = await fetch('questions.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
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
  // Menu 1..450
  // ==========================
  function buildMenu() {
    const grid = el.questionGrid || el.menuContainer;
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 1; i <= 450; i++) {
      const btn = document.createElement('button');
      btn.className = 'qbtn btn btn-purple';
      btn.dataset.id = String(i);
      btn.textContent = i.toString();

      if (!state.availableIds.has(i) || state.answered.has(i)) {
        btn.disabled = true;
        btn.classList.add('btn-disabled');
      }

      btn.addEventListener('click', () => showQuestion(i));
      grid.appendChild(btn);
    }
  }

  function refreshMenuButton(id) {
    const grid = el.questionGrid || el.menuContainer;
    if (!grid) return;
    const btn = grid.querySelector(`button[data-id="${id}"]`);
    if (btn) btn.disabled = true;
  }

  // ==========================
  // Mostrar pergunta
  // ==========================
  function showQuestion(id) {
    const q = state.questionsMap.get(id);
    state.currentId = id;
    if (!q) { alert('Pergunta não encontrada: ' + id); return; }

    switchToView('question');
    syncLanguageSelectors();

    if (el.questionNumberBadge) el.questionNumberBadge.textContent = `#${id}`;
    if (el.backToMenuBtn) {
      el.backToMenuBtn.disabled = false;
      el.backToMenuBtn.onclick = () => switchToView('menu');
    }
    if (el.feedbackContainer) show(el.feedbackContainer, false);

    if (q.trap) {
      renderTrap(q);
      // trap deve sumir do menu após clicada
      state.answered.add(id);
      refreshMenuButton(id);
    } else {
      renderQuestion(q);
    }
  }

  function renderTrap(q) {
    if (el.questionTitle) el.questionTitle.textContent = '';
    if (el.optionsList) el.optionsList.innerHTML = '';

    const msg = (q.trapMessage && q.trapMessage[state.lang]) || i18n.trapDefault[state.lang];
    const wrapper = el.trapWrapper || el.questionContainer;
    if (wrapper) wrapper.classList.add('trap-mode');

    const trapBlock = document.createElement('div');
    trapBlock.className = 'trap-block';

    const p = document.createElement('p');
    p.className = 'trap-text';
    p.textContent = msg;
    trapBlock.appendChild(p);

    if (q.image) {
      const img = document.createElement('img');
      img.src = q.image;
      img.alt = 'trap';
      img.className = 'trap-image';
      trapBlock.appendChild(img);
    }

    if (el.optionsList) el.optionsList.appendChild(trapBlock);
  }

  function renderQuestion(q) {
    const title = (q.q && q.q[state.lang]) || '';
    if (el.questionTitle) el.questionTitle.textContent = title;

    const opts = (q.options && q.options[state.lang]) || [];
    if (el.optionsList) {
      el.optionsList.innerHTML = '';
      opts.forEach((optText, idx) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'option btn btn-outline';
        btn.textContent = optText;
        btn.addEventListener('click', () => checkAnswer(q, idx));
        li.appendChild(btn);
        el.optionsList.appendChild(li);
      });
    }

    const wrapper = el.trapWrapper || el.questionContainer;
    if (wrapper) wrapper.classList.remove('trap-mode');
  }

  // ==========================
  // Heurística para rationale desalinhado
  // ==========================
  function pickRationale(rats, opts, selectedIdx, correctIdx) {
    if (Array.isArray(rats) && rats[selectedIdx]) return rats[selectedIdx];

    const norm = (s) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();

    const sel = norm(opts[selectedIdx] || '');
    if (Array.isArray(rats) && sel) {
      const pivot = sel.split(/\s+/).slice(0, 2).join(' ');
      for (const r of rats) {
        if (typeof r === 'string') {
          const rr = norm(r);
          if ((pivot && rr.includes(pivot)) || rr.includes(sel)) return r;
        }
      }
    }
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

    if (el.feedbackTitle) {
      el.feedbackTitle.textContent = isCorrect
        ? i18n.headingRationaleRight[lang]
        : i18n.headingRationaleWrong[lang];
    }

    let rationale = '';
    if (Array.isArray(rats) && rats.length) {
      rationale = isCorrect
        ? (rats[correctIdx] ?? '')
        : pickRationale(rats, opts, selectedIdx, correctIdx);
    }
    if (el.feedbackRationale) el.feedbackRationale.textContent = rationale;
    if (el.feedbackContainer) show(el.feedbackContainer, true);

    state.answered.add(q.id);
  }

  // ==========================
  // Idioma
  // ==========================
  function setLanguage(lang) {
    state.lang = lang === 'en' ? 'en' : 'pt';
    localStorage.setItem('lang', state.lang);
    if (state.currentId != null) {
      const q = state.questionsMap.get(state.currentId);
      if (q) q.trap ? renderTrap(q) : renderQuestion(q);
    }
    syncLanguageSelectors();
  }

  function syncLanguageSelectors() {
    if (el.languageSelectMenu) el.languageSelectMenu.value = state.lang;
    if (el.languageSelectQuestion) el.languageSelectQuestion.value = state.lang;
  }

  if (el.languageSelectMenu) {
    el.languageSelectMenu.addEventListener('change', (e) => setLanguage(e.target.value));
  }
  if (el.languageSelectQuestion) {
    el.languageSelectQuestion.addEventListener('change', (e) => setLanguage(e.target.value));
  }

  // ==========================
  // Init
  // ==========================
  document.addEventListener('DOMContentLoaded', () => {
    // estilos utilitários se o CSS não existir
    injectFallbackStyles();

    setupLogin();

    if (state.user) {
      // já logado
      switchToView('menu'); // evita flicker do login
      initAfterLogin();
    } else {
      // precisa logar
      switchToView('login');
      if (el.usernameInput) el.usernameInput.focus();
    }
  });

  function injectFallbackStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .hidden { display: none !important; }
      .btn { cursor: pointer; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; }
      .btn:disabled { opacity: .35; cursor: not-allowed; }
      .btn-purple { background: #7C3AED; color: #fff; border-color: #7C3AED; }
      .btn-outline { background: #fff; border-color: #e5e7eb; }
      .btn-disabled { background: #f3f4f6; color: #9ca3af; }
      .qbtn { margin: 4px; min-width: 48px; }

      #optionsList { list-style: none; padding: 0; margin: 0; }
      #optionsList li { margin-bottom: 12px; }
      #optionsList .option { width: 100%; text-align: left; }

      .trap-mode .trap-block { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; }
      .trap-text { color: #DC2626; font-weight: 700; margin-bottom: 16px; }
      .trap-image { max-width: 380px; width: 100%; height: auto; display: block; }

      /* Mensagem de erro do login */
      #loginError { color: #DC2626; margin-top: 8px; }
    `;
    document.head.appendChild(style);
  }
})();
