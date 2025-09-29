// === Estado global ===
let currentLang = 'pt'; // 'pt' | 'en'
let allQuestions = [];        // array carregado do questions.json
let questionByIndex = [];     // array 0..449 com perguntas ou null
let answeredSet = new Set();  // índices 0-based respondidos
let disabledIndices = new Set(); // traps clicadas/itens removidos do menu
let currentQuestionIndex = -1;

// === Referências de elementos ===
const loginPage = document.getElementById('login-page');
const startPage = document.getElementById('start-page');
const quizArea = document.getElementById('quiz-area');

const headerSubtitle = document.getElementById('header-subtitle');

const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');

const menuOptions = document.getElementById('menu-options');
const globalLangSel = document.getElementById('global-lang');

const backTopBtn = document.getElementById('back-to-menu-top');
const backBottomBtn = document.getElementById('back-to-menu-bottom');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackContainer = document.getElementById('feedback-container');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackRationale = document.getElementById('feedback-rationale');

const questionNumberEl = document.getElementById('question-number');

const loadErrorEl = document.getElementById('load-error');

// === Utilidades ===
function getDisplayText(obj, lang) {
  // Campos multilíngues no JSON: { pt: "...", en: "..." }
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object') {
    return obj[lang] ?? obj['pt'] ?? '';
  }
  return '';
}

function getOptionsArray(questionObj, lang) {
  // questionObj.options pode ser {pt:[...], en:[...]} ou array simples
  if (!questionObj || !questionObj.options) return [];
  const opts = Array.isArray(questionObj.options)
    ? questionObj.options
    : questionObj.options[lang] || questionObj.options['pt'] || [];
  return opts;
}

function getRationalesArray(questionObj, lang) {
  if (!questionObj || !questionObj.rationales) return [];
  const rats = Array.isArray(questionObj.rationales)
    ? questionObj.rationales
    : questionObj.rationales[lang] || questionObj.rationales['pt'] || [];
  return rats;
}

function isTrap(questionObj) {
  return questionObj && questionObj.trap === 'phishing';
}

// === Construção do menu ===
function buildMenu() {
  menuOptions.innerHTML = '';
  const TOTAL = 450;

  for (let i = 0; i < TOTAL; i++) {
    const btn = document.createElement('button');
    const labelNum = i + 1;

    btn.textContent = labelNum.toString();
    btn.className = 'menu-item-button py-2 text-center text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-4';

    const qObj = questionByIndex[i];
    const isDisabled = disabledIndices.has(i);
    const isAnswered = answeredSet.has(i);

    if (!qObj || isDisabled) {
      // não existe no JSON OU foi desabilitada (trap clicada)
      btn.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed', 'shadow-inner');
      btn.disabled = true;
    } else {
      if (isAnswered) {
        btn.classList.add('bg-gray-400', 'text-white', 'cursor-not-allowed', 'shadow-inner');
        btn.disabled = true;
      } else {
        btn.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600', 'focus:ring-blue-300');
        btn.disabled = false;
        btn.onclick = () => loadQuestion(i);
      }
    }
    menuOptions.appendChild(btn);
  }
}

// === Login ===
function handleLogin() {
  const username = document.getElementById('username').value;
  if (username.trim() !== '') {
    loginPage.classList.add('hidden');
    headerSubtitle.textContent = "Selecione uma pergunta para testar seus conhecimentos sobre estratégia e responsabilidades de segurança da informação.";
    showStartPage();
    loginError.classList.add('hidden');
  } else {
    loginError.classList.remove('hidden');
  }
}

// === Páginas ===
function showStartPage() {
  loginPage.classList.add('hidden');
  startPage.classList.remove('hidden');
  quizArea.classList.add('hidden');
  feedbackContainer.classList.add('hidden');
  currentQuestionIndex = -1;
  buildMenu();
}

function showQuizArea() {
  startPage.classList.add('hidden');
  quizArea.classList.remove('hidden');
}

// === Carregamento de perguntas (questions.json) ===
async function loadQuestions() {
  try {
    const resp = await fetch('questions.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('JSON não é um array');

    allQuestions = data;

    // Mapear para índices 0..449 conforme id (1..450)
    questionByIndex = new Array(450).fill(null);
    for (const q of allQuestions) {
      if (typeof q.id === 'number' && q.id >= 1 && q.id <= 450) {
        const idx = q.id - 1;
        questionByIndex[idx] = q;
      }
    }

    loadErrorEl.classList.add('hidden');
  } catch (e) {
    console.error('Falha ao carregar questions.json', e);
    loadErrorEl.classList.remove('hidden');
  }
}

// === Renderização de pergunta ===
function loadQuestion(index) {
  currentQuestionIndex = index;
  const qObj = questionByIndex[index];
  if (!qObj) { showStartPage(); return; }

  // Número da pergunta (usa id do JSON se tiver; senão, index+1)
  const displayId = (typeof qObj.id === 'number') ? qObj.id : (index + 1);
  if (questionNumberEl) {
    questionNumberEl.textContent = (currentLang === 'en')
      ? `Question ${displayId}`
      : `Pergunta ${displayId}`;
  }

  // Se for TRAP: mostra a tela de trap e remove do menu em seguida
  if (isTrap(qObj)) {
    showQuizArea();
    renderTrap(qObj);
    // desabilita no menu (some quando voltar)
    disabledIndices.add(index);
    return;
  }

  // Pergunta normal
  showQuizArea();
  renderQuestion(qObj);
}

// Renderiza TRAP (phishing)
function renderTrap(qObj) {
  questionText.textContent = '';
  optionsContainer.innerHTML = '';
  feedbackContainer.classList.add('hidden');

  const msg = getDisplayText(qObj.trapMessage, currentLang) || (currentLang === 'en'
    ? 'YOU FELL FOR PHISHING! TRY AGAIN LATER!'
    : 'VOCÊ CAIU NO PHISHING! TENTE NOVAMENTE MAIS TARDE!'
  );

  questionText.textContent = msg;

  if (qObj.image) {
    const img = document.createElement('img');
    img.src = qObj.image;
    img.alt = 'phishing';
    img.className = 'mt-2 max-h-72 object-contain rounded-lg border';
    optionsContainer.appendChild(img);
  }
}

// Renderiza pergunta e opções
function renderQuestion(qObj) {
  const qText = getDisplayText(qObj.q, currentLang) || getDisplayText(qObj.question, currentLang) || '';
  questionText.textContent = qText;

  optionsContainer.innerHTML = '';
  feedbackContainer.classList.add('hidden');
  feedbackTitle.textContent = '';
  feedbackRationale.textContent = '';

  const opts = getOptionsArray(qObj, currentLang);
  const rats = getRationalesArray(qObj, currentLang);
  const correctIndex = typeof qObj.correctIndex === 'number' ? qObj.correctIndex : -1;

  // Embaralha opções preservando índice original
  const shuffled = opts.map((t, i) => ({ text: t, idx: i }))
    .sort(() => Math.random() - 0.5);

  shuffled.forEach(({ text, idx }) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'answer-button w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500';
    button.onclick = () => checkAnswer(button, idx, { correctIndex, rats, opts });
    optionsContainer.appendChild(button);
  });
}

// Verifica resposta
function checkAnswer(selectedButton, selectedIdx, ctx) {
  // Marca como respondida somente ao responder
  if (currentQuestionIndex !== -1 && !answeredSet.has(currentQuestionIndex)) {
    answeredSet.add(currentQuestionIndex);
  }

  // Desabilita botões
  document.querySelectorAll('.answer-button').forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('hover:bg-blue-50');
  });

  const isCorrect = selectedIdx === ctx.correctIndex;

  if (isCorrect) {
    selectedButton.classList.remove('border-gray-300');
    selectedButton.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-semibold');
    feedbackContainer.className = 'mt-6 p-4 rounded-lg border-l-4 bg-green-50 border-green-500';
    feedbackTitle.textContent = (currentLang === 'en') ? 'Correct!' : 'Correto!';
    feedbackTitle.className = 'text-lg font-bold text-green-700';
  } else {
    selectedButton.classList.remove('border-gray-300');
    selectedButton.classList.add('bg-red-100', 'border-red-500', 'text-red-800', 'font-semibold');

    // Destaca a correta
    const correctText = ctx.opts[ctx.correctIndex];
    document.querySelectorAll('.answer-button').forEach(btn => {
      if (btn.textContent === correctText) {
        btn.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-semibold');
      }
    });

    feedbackContainer.className = 'mt-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-500';
    feedbackTitle.textContent = (currentLang === 'en')
      ? 'Incorrect. Review the rationale:'
      : 'Incorreto. Revise a justificativa:';
    feedbackTitle.className = 'text-lg font-bold text-red-700';
  }

  // Mostra justificativa (a do índice correto)
  const rationale = ctx.rats[ctx.correctIndex] || '';
  feedbackRationale.textContent = rationale;
  feedbackContainer.classList.remove('hidden');
}

// === Navegação e idioma ===
function wireEvents() {
  loginButton.addEventListener('click', handleLogin);

  backTopBtn.addEventListener('click', () => showStartPage());
  backBottomBtn.addEventListener('click', () => showStartPage());

  // Idioma global: atualiza a pergunta exibida (se houver) e os rótulos
  globalLangSel.addEventListener('change', (e) => {
    currentLang = e.target.value;

    // Atualiza rótulo/número da pergunta
    if (!quizArea.classList.contains('hidden') && currentQuestionIndex >= 0) {
      const qObj = questionByIndex[currentQuestionIndex];
      if (qObj) {
        const displayId = (typeof qObj.id === 'number') ? qObj.id : (currentQuestionIndex + 1);
        if (questionNumberEl) {
          questionNumberEl.textContent = (currentLang === 'en')
            ? `Question ${displayId}`
            : `Pergunta ${displayId}`;
        }
        isTrap(qObj) ? renderTrap(qObj) : renderQuestion(qObj);
      }
    }
  });
}

// === Bootstrap ===
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadQuestions();
  } finally {
    // mostra login por padrão
    loginPage.classList.remove('hidden');
    startPage.classList.add('hidden');
    quizArea.classList.add('hidden');

    // seletor global inicia no idioma default
    globalLangSel.value = currentLang;

    wireEvents();
  }
});
