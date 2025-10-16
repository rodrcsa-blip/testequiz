// === Estado global ===
let currentLang = 'pt'; // 'pt' | 'en'
let allQuestions = [];
let questionByIndex = [];
let answeredSet = new Set();
let disabledIndices = new Set();
let currentQuestionIndex = -1;

// Registros de resultado por questão (index -> { id, correct, selectedText, correctText, ts })
let resultsMap = new Map();

// Botão de exportação (criado dinamicamente)
let exportBtn = null;

// === Usuários (normais e master) ===
const USERS = {
  "pescariagrc": "Governanca01!",       // usuário normal (progresso salvo)
  "bombeiro": "salvesequempuder01!"     // usuário master (não grava progresso, sempre libera tudo)
};

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
const logoutButton = document.getElementById('logout-button');
const resetButton = document.getElementById('reset-button');

const loadErrorEl = document.getElementById('load-error');

// ===== Persistência de progresso por usuário (localStorage) =====
function storageKeyForUser(username) {
  return `quizProgress:${username}`;
}
function storageResultsKeyForUser(username) {
  return `quizResults:${username}`;
}
function saveProgress(username, answeredIdsArray) {
  try { localStorage.setItem(storageKeyForUser(username), JSON.stringify(answeredIdsArray)); }
  catch (e) { console.warn('Falha ao salvar progresso:', e); }
}
function loadProgress(username) {
  try {
    const raw = localStorage.getItem(storageKeyForUser(username));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn('Falha ao carregar progresso:', e);
    return [];
  }
}
function saveResults(username) {
  try {
    const arr = [];
    for (const [idx, rec] of resultsMap.entries()) {
      arr.push(rec);
    }
    localStorage.setItem(storageResultsKeyForUser(username), JSON.stringify(arr));
  } catch (e) {
    console.warn('Falha ao salvar resultados:', e);
  }
}
function loadResults(username) {
  resultsMap = new Map();
  try {
    const raw = localStorage.getItem(storageResultsKeyForUser(username));
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const rec of arr) {
        if (rec && typeof rec.id === 'number' && typeof rec.index === 'number') {
          resultsMap.set(rec.index, rec);
        }
      }
    }
  } catch (e) {
    console.warn('Falha ao carregar resultados:', e);
  }
}

// === Utilidades ===
function getDisplayText(obj, lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object') return obj[lang] ?? obj['pt'] ?? '';
  return '';
}
function getOptionsArray(questionObj, lang) {
  if (!questionObj || !questionObj.options) return [];
  return Array.isArray(questionObj.options)
    ? questionObj.options
    : questionObj.options[lang] || questionObj.options['pt'] || [];
}
function getRationalesArray(questionObj, lang) {
  if (!questionObj || !questionObj.rationales) return [];
  return Array.isArray(questionObj.rationales)
    ? questionObj.rationales
    : questionObj.rationales[lang] || questionObj.rationales['pt'] || [];
}
function isTrap(questionObj) {
  return questionObj && questionObj.trap === 'phishing';
}

// === Construção do menu ===
function buildMenu() {
  menuOptions.innerHTML = '';
  const TOTAL = 450;
  const username = localStorage.getItem("loggedUser");
  const isMaster = username === "bombeiro";

  for (let i = 0; i < TOTAL; i++) {
    const btn = document.createElement('button');
    const labelNum = i + 1;

    btn.textContent = labelNum.toString();
    btn.className = 'menu-item-button py-2 text-center text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-4';

    const qObj = questionByIndex[i];
    const isDisabled = disabledIndices.has(i);
    const isAnswered = answeredSet.has(i);

    if (!qObj || isDisabled) {
      btn.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed', 'shadow-inner');
      btn.disabled = true;
    } else if (!isMaster && isAnswered) {
      btn.classList.add('bg-gray-400', 'text-white', 'cursor-not-allowed', 'shadow-inner');
      btn.disabled = true;
    } else {
      btn.classList.add('bg-purple-500', 'text-white', 'hover:bg-purple-600', 'focus:ring-purple-300');
      btn.disabled = false;
      btn.onclick = () => loadQuestion(i);
    }

    menuOptions.appendChild(btn);
  }
}

// === Exportação de progresso em CSV (novo) ===
function collectAnsweredIdsSorted() {
  return Array.from(answeredSet)
    .map(idx => {
      const qObj = questionByIndex[idx];
      return (qObj && typeof qObj.id === 'number') ? qObj.id : (idx + 1);
    })
    .sort((a, b) => a - b);
}
function csvEscape(val) {
  const s = String(val ?? '');
  // coloca entre aspas e escapa aspas internas
  return `"${s.replace(/"/g, '""')}"`;
}
function exportProgressCSV() {
  const username = localStorage.getItem("loggedUser");
  if (!username) {
    alert('Faça login para exportar seu progresso.');
    return;
  }

  const answeredIds = collectAnsweredIdsSorted();

  // Deriva corretos/incorretos a partir do resultsMap
  const correctIds = [];
  const incorrectIds = [];
  for (const idx of answeredIds.map(id => id - 1)) {
    const rec = resultsMap.get(idx);
    if (rec && typeof rec.correct === 'boolean') {
      if (rec.correct) correctIds.push(rec.id);
      else incorrectIds.push(rec.id);
    }
    // Caso não haja registro (respostas antigas), fica fora das listas.
  }

  const availableCount = questionByIndex.filter(Boolean).length;
  const correctCount = correctIds.length;
  const incorrectCount = incorrectIds.length;

  const header = [
    'user', 'lang', 'answered_ids', 'correct_ids', 'incorrect_ids',
    'answered_count', 'correct_count', 'incorrect_count', 'exported_at'
  ].join(',');

  const row = [
    csvEscape(username),
    csvEscape(currentLang),
    csvEscape(answeredIds.join(';')),
    csvEscape(correctIds.join(';')),
    csvEscape(incorrectIds.join(';')),
    answeredIds.length,
    correctCount,
    incorrectCount,
    csvEscape(new Date().toISOString())
  ].join(',');

  const csv = `${header}\n${row}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateTag = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `quiz-progress-${username}-${dateTag}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function ensureExportButton() {
  if (exportBtn && document.body.contains(exportBtn)) {
    exportBtn.classList.remove('hidden');
    return;
  }
  const anchor = resetButton || logoutButton || headerSubtitle || startPage;
  if (!anchor) return;

  exportBtn = document.createElement('button');
  exportBtn.id = 'export-button';
  exportBtn.type = 'button';
  exportBtn.className = 'ml-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300';
  exportBtn.textContent = (currentLang === 'en') ? 'Export progress (CSV)' : 'Exportar progresso (CSV)';
  exportBtn.addEventListener('click', exportProgressCSV);

  if (resetButton && resetButton.parentNode) {
    resetButton.parentNode.insertBefore(exportBtn, resetButton.nextSibling);
  } else if (startPage) {
    startPage.insertBefore(exportBtn, startPage.firstChild);
  } else {
    document.body.appendChild(exportBtn);
  }
}
function hideExportButton() {
  if (exportBtn) exportBtn.classList.add('hidden');
}

// === Login (usuário normal vs master) ===
function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (username === '' || password === '') {
    loginError.textContent = "Por favor, preencha todos os campos.";
    loginError.classList.remove('hidden');
    return;
  }

  if (USERS[username] && USERS[username] === password) {
    localStorage.setItem("loggedUser", username);

    answeredSet = new Set();
    disabledIndices = new Set();

    // Apenas usuários normais carregam progresso + resultados
    if (username !== "bombeiro") {
      const answeredIds = loadProgress(username);
      for (const id of answeredIds) {
        const idx = id - 1;
        if (idx >= 0 && idx < questionByIndex.length && questionByIndex[idx]) {
          answeredSet.add(idx);
        }
      }
      loadResults(username); // carrega corretos/incorretos salvos
    } else {
      resultsMap = new Map(); // master não persiste
    }

    headerSubtitle.textContent =
      "Selecione uma pergunta para testar seus conhecimentos sobre Governança, Compliance, TPRM e as melhores práticas de Segurança da Informação do Nubank";

    resetButton.classList.remove('hidden');
    logoutButton.classList.remove('hidden');

    loginPage.classList.add('hidden');
    showStartPage();
    ensureExportButton();
    exportBtn.textContent = (currentLang === 'en') ? 'Export progress (CSV)' : 'Exportar progresso (CSV)';
    loginError.classList.add('hidden');
  } else {
    loginError.textContent = "Usuário ou senha incorretos.";
    loginError.classList.remove('hidden');
  }
}

// === Logout (não apaga progresso, só encerra sessão) ===
function handleLogout() {
  localStorage.removeItem("loggedUser");

  answeredSet = new Set();
  disabledIndices = new Set();
  resultsMap = new Map();

  resetButton.classList.add('hidden');
  logoutButton.classList.add('hidden');
  hideExportButton();

  headerSubtitle.textContent = "Por favor, faça o login para começar.";
  loginPage.classList.remove('hidden');
  startPage.classList.add('hidden');
  quizArea.classList.add('hidden');
}

// === Resetar progresso do usuário atual (com confirmação) ===
function resetProgress() {
  const username = localStorage.getItem("loggedUser");
  if (!username || username === "bombeiro") return;

  const confirmReset = confirm("Tem certeza que deseja resetar todas as questões respondidas?");
  if (!confirmReset) return;

  localStorage.removeItem(storageKeyForUser(username));
  localStorage.removeItem(storageResultsKeyForUser(username));

  answeredSet = new Set();
  disabledIndices = new Set();
  resultsMap = new Map();

  buildMenu();
  feedbackContainer.classList.add('hidden');
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

// === Carregamento de perguntas ===
async function loadQuestions() {
  try {
    const resp = await fetch('questions.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('JSON não é um array');

    allQuestions = data;

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

  const displayId = (typeof qObj.id === 'number') ? qObj.id : (index + 1);
  if (questionNumberEl) {
    questionNumberEl.textContent = (currentLang === 'en')
      ? `Question ${displayId}`
      : `Pergunta ${displayId}`;
  }

  if (isTrap(qObj)) {
    showQuizArea();
    renderTrap(qObj);
    disabledIndices.add(index);
    return;
  }

  showQuizArea();
  renderQuestion(qObj);
}

// === Renderiza TRAP ===
function renderTrap(qObj) {
  questionText.textContent = '';
  optionsContainer.innerHTML = '';
  feedbackContainer.classList.add('hidden');

  const msg = getDisplayText(qObj.trapMessage, currentLang) || (currentLang === 'en'
    ? 'YOU FELL FOR PHISHING! TRY AGAIN LATER!'
    : 'VOCÊ CAIU NO PHISHING! TENTE NOVAMENTE MAIS TARDE!'
  );

  questionText.textContent = msg;
  questionText.className = 'text-xl font-semibold text-red-600 bg-red-50 p-4 rounded-lg border border-red-300 text-center';

  if (qObj.image) {
    const img = document.createElement('img');
    img.src = qObj.image;
    img.alt = 'phishing';
    img.className = 'mt-4 max-h-72 object-contain rounded-lg border mx-auto block';
    optionsContainer.appendChild(img);
  }
}

// === Renderiza pergunta normal ===
function renderQuestion(qObj) {
  const qText = getDisplayText(qObj.q, currentLang) || getDisplayText(qObj.question, currentLang) || '';
  questionText.textContent = qText;
  questionText.className = 'text-xl font-semibold text-gray-800 bg-purple-50 p-4 rounded-lg border border-purple-200';

  optionsContainer.innerHTML = '';
  feedbackContainer.classList.add('hidden');
  feedbackTitle.textContent = '';
  feedbackRationale.textContent = '';

  const opts = getOptionsArray(qObj, currentLang);
  const rats = getRationalesArray(qObj, currentLang);
  const correctIndex = typeof qObj.correctIndex === 'number' ? qObj.correctIndex : -1;

  const correctText = (correctIndex >= 0 && correctIndex < opts.length) ? opts[correctIndex] : '';
  const correctRationale = (correctIndex >= 0 && correctIndex < rats.length) ? rats[correctIndex] : '';

  const rationaleMap = new Map();
  for (let i = 0; i < opts.length; i++) {
    rationaleMap.set(opts[i], rats[i] || '');
  }

  const orderedTexts = opts.slice();
  orderedTexts.forEach((text) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'answer-button w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-purple-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500';
    button.onclick = () => checkAnswerByText(button, text, { correctText, correctRationale, rationaleMap });
    optionsContainer.appendChild(button);
  });
}

// === Verifica resposta ===
function checkAnswerByText(selectedButton, selectedText, ctx) {
  if (currentQuestionIndex !== -1 && !answeredSet.has(currentQuestionIndex)) {
    answeredSet.add(currentQuestionIndex);
  }

  const allButtons = document.querySelectorAll('.answer-button');
  allButtons.forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('hover:bg-purple-50');
  });

  const isCorrect = selectedText === ctx.correctText;

  if (isCorrect) {
    selectedButton.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-semibold');
    feedbackContainer.className = 'mt-6 p-4 rounded-lg border-l-4 bg-green-50 border-green-500';
    feedbackTitle.textContent = (currentLang === 'en') ? 'Correct!' : 'Correto!';
    feedbackTitle.className = 'text-lg font-bold text-green-700';
    feedbackRationale.textContent = ctx.correctRationale || '';
  } else {
    selectedButton.classList.add('bg-red-100', 'border-red-500', 'text-red-800', 'font-semibold');
    allButtons.forEach(btn => {
      if (btn.textContent === ctx.correctText) {
        btn.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-semibold');
      }
    });
    feedbackContainer.className = 'mt-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-500';
    feedbackTitle.textContent = (currentLang === 'en')
      ? 'Incorrect. Review the rationale:'
      : 'Incorreto. Revise a justificativa:';
    feedbackTitle.className = 'text-lg font-bold text-red-700';
    const chosenRationale = ctx.rationaleMap.get(selectedText) || '';
    feedbackRationale.textContent = chosenRationale;
  }

  // REGISTRA resultado desta questão e persiste (exceto master)
  const username = localStorage.getItem("loggedUser");
  const qObj = questionByIndex[currentQuestionIndex];
  const id = (qObj && typeof qObj.id === 'number') ? qObj.id : (currentQuestionIndex + 1);
  const rec = {
    index: currentQuestionIndex,
    id,
    correct: isCorrect,
    selectedText,
    correctText: ctx.correctText,
    ts: new Date().toISOString()
  };
  resultsMap.set(currentQuestionIndex, rec);

  if (username && username !== "bombeiro") {
    const answeredIds = collectAnsweredIdsSorted();
    saveProgress(username, answeredIds);
    saveResults(username);
  }

  feedbackContainer.classList.remove('hidden');
}

// === Eventos / idioma ===
function wireEvents() {
  loginButton.addEventListener('click', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  resetButton.addEventListener('click', resetProgress);

  backTopBtn.addEventListener('click', () => showStartPage());
  backBottomBtn.addEventListener('click', () => showStartPage());

  globalLangSel.addEventListener('change', (e) => {
    currentLang = e.target.value;
    if (exportBtn) {
      exportBtn.textContent = (currentLang === 'en') ? 'Export progress (CSV)' : 'Exportar progresso (CSV)';
    }
    if (!quizArea.classList.contains('hidden') && currentQuestionIndex >= 0) {
      const qObj = questionByIndex[currentQuestionIndex];
      if (qObj) {
        const displayId = (typeof qObj.id === 'number') ? qObj.id : (currentQuestionIndex + 1);
        questionNumberEl.textContent = (currentLang === 'en')
          ? `Question ${displayId}`
          : `Pergunta ${displayId}`;
        isTrap(qObj) ? renderTrap(qObj) : renderQuestion(qObj);
      }
    }
  });
}

// === Bootstrap ===
document.addEventListener('DOMContentLoaded', async () => {
  await loadQuestions();

  const savedUser = localStorage.getItem("loggedUser");
  if (savedUser && USERS[savedUser]) {
    // Se não for master, restaura progresso + resultados
    if (savedUser !== "bombeiro") {
      answeredSet = new Set();
      const answeredIds = loadProgress(savedUser);
      for (const id of answeredIds) {
        const idx = id - 1;
        if (idx >= 0 && idx < questionByIndex.length && questionByIndex[idx]) {
          answeredSet.add(idx);
        }
      }
      loadResults(savedUser);
    } else {
      resultsMap = new Map();
    }

    headerSubtitle.textContent =
      "Selecione uma pergunta para testar seus conhecimentos sobre Governança, Compliance, TPRM e as melhores práticas de Segurança da Informação do Nubank";
    resetButton.classList.remove('hidden');
    logoutButton.classList.remove('hidden');
    loginPage.classList.add('hidden');
    showStartPage();
    ensureExportButton();
    exportBtn.textContent = (currentLang === 'en') ? 'Export progress (CSV)' : 'Exportar progresso (CSV)';
  } else {
    headerSubtitle.textContent = "Por favor, faça o login para começar.";
    resetButton.classList.add('hidden');
    logoutButton.classList.add('hidden');
    hideExportButton();
    loginPage.classList.remove('hidden');
    startPage.classList.add('hidden');
    quizArea.classList.add('hidden');
  }

  globalLangSel.value = currentLang;
  wireEvents();
});
